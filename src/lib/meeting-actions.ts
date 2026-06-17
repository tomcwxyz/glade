"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/db";
import {
  meetings,
  meetingAgendaItems,
  meetingAttendees,
  meetingDecisions,
  meetingActions,
  actions,
  actionOwners,
  decisions,
  spaceMembers,
  topics,
  proposals,
} from "@/db/schema";
import { requireSpaceRole } from "@/lib/space";
import { createInitialState } from "@/lib/meeting-state";
import { canUseLiveMeetings } from "@/lib/billing";
import { logDeletion } from "@/lib/audit";
import { insertDecisionWithUniqueNumber } from "@/lib/queries";
import { notifyMeetingStarted } from "@/lib/notification-actions";

type MeetingStatus = "draft" | "scheduled" | "in_progress" | "completed";

type DecisionMethod =
  | "consent"
  | "majority_vote"
  | "advice_process"
  | "delegation"
  | "consensus"
  | "lazy_consensus";

/**
 * Persist decisions and actions captured in the meeting form, within an existing
 * transaction. Add-only: records new decisions, links existing ones (deduped),
 * and creates meeting actions with member owners. Lets the meeting dialogue
 * capture minute outcomes in one pass instead of after the fact.
 */
async function persistMeetingCapture(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  spaceId: string,
  userId: string,
  meetingId: string,
  meetingDate: Date,
  formData: FormData
) {
  // New decisions recorded inline.
  const newTitles = formData.getAll("newDecisionTitle") as string[];
  const newMethods = formData.getAll("newDecisionMethod") as string[];
  const newOutcomes = formData.getAll("newDecisionOutcome") as string[];
  for (let i = 0; i < newTitles.length; i++) {
    const title = newTitles[i]?.trim();
    if (!title) continue;
    const decision = await insertDecisionWithUniqueNumber(
      spaceId,
      {
        title,
        method: (newMethods[i] || "consent") as DecisionMethod,
        outcome: newOutcomes[i]?.trim() || null,
        status: "decided",
        date: meetingDate,
        createdBy: userId,
      },
      tx
    );
    await tx.insert(meetingDecisions).values({ meetingId, decisionId: decision.id });
  }

  // Link existing decisions (space-scoped, deduped).
  const linkIds = (formData.getAll("linkDecisionId") as string[]).filter(Boolean);
  for (const decisionId of linkIds) {
    const [owned] = await tx
      .select({ id: decisions.id })
      .from(decisions)
      .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, spaceId)))
      .limit(1);
    if (!owned) continue;
    const [linked] = await tx
      .select({ decisionId: meetingDecisions.decisionId })
      .from(meetingDecisions)
      .where(
        and(eq(meetingDecisions.meetingId, meetingId), eq(meetingDecisions.decisionId, decisionId))
      )
      .limit(1);
    if (!linked) await tx.insert(meetingDecisions).values({ meetingId, decisionId });
  }

  // Actions attached to the meeting (with optional member owners).
  const aDescriptions = formData.getAll("mActionDescription") as string[];
  const aOwnerNames = formData.getAll("mActionOwnerName") as string[];
  const aOwnerIds = formData.getAll("mActionOwnerIds") as string[]; // ";"-joined per action
  const aDueDates = formData.getAll("mActionDueDate") as string[];
  for (let i = 0; i < aDescriptions.length; i++) {
    const description = aDescriptions[i]?.trim();
    if (!description) continue;
    const ownerIdList = (aOwnerIds[i] || "").split(";").filter(Boolean);
    const validOwnerIds =
      ownerIdList.length > 0
        ? (
            await tx
              .select({ userId: spaceMembers.userId })
              .from(spaceMembers)
              .where(
                and(eq(spaceMembers.spaceId, spaceId), inArray(spaceMembers.userId, ownerIdList))
              )
          ).map((m) => m.userId)
        : [];
    const [action] = await tx
      .insert(actions)
      .values({
        spaceId,
        description,
        ownerName: aOwnerNames[i]?.trim() || null,
        dueDate: aDueDates[i] ? new Date(aDueDates[i]) : null,
        status: "open",
      })
      .returning({ id: actions.id });
    if (validOwnerIds.length > 0) {
      await tx.insert(actionOwners).values(
        validOwnerIds.map((ownerUserId) => ({ actionId: action.id, userId: ownerUserId }))
      );
    }
    await tx.insert(meetingActions).values({ meetingId, actionId: action.id });
  }
}

/** Create a lightweight decision and link it to a meeting in one step, so users
 *  don't have to leave the meeting page to record a decision and link it back.
 *  The decision is dated to the meeting and can be fleshed out later. */
export async function createDecisionForMeeting(
  meetingId: string,
  title: string,
  method: string,
  outcome?: string
) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  if (!title.trim()) return { error: "Title is required" };

  const [meeting] = await db
    .select({ id: meetings.id, date: meetings.date })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)))
    .limit(1);
  if (!meeting) return { error: "Meeting not found" };

  const decision = await db.transaction(async (tx) => {
    const created = await insertDecisionWithUniqueNumber(
      space.id,
      {
        title: title.trim(),
        method: (method || "consent") as DecisionMethod,
        outcome: outcome?.trim() || null,
        status: "decided",
        date: meeting.date,
        createdBy: user.id,
      },
      tx
    );
    await tx.insert(meetingDecisions).values({ meetingId, decisionId: created.id });
    return created;
  });

  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath("/decisions");
  revalidatePath("/dashboard");
  return { success: true, number: decision.number };
}

export async function createMeeting(formData: FormData) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Meeting title is required" };

  const dateStr = formData.get("date") as string;
  if (!dateStr) return { error: "Date is required" };

  const type = (formData.get("type") as string)?.trim() || null;
  const status = ((formData.get("status") as string)?.trim() || "draft") as MeetingStatus;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const facilitatorId = (formData.get("facilitatorId") as string)?.trim() || null;
  const isPublic = formData.get("hideFromPublic") !== "on";
  const attendeeIdsRaw = formData.get("attendeeIds") as string;

  const attendeeIds = attendeeIdsRaw
    ? attendeeIdsRaw.split(",").filter(Boolean)
    : [];

  // Parse agenda items up front.
  const agendaTitles = formData.getAll("agendaTitle") as string[];
  const agendaDescriptions = formData.getAll("agendaDescription") as string[];
  const agendaTypes = formData.getAll("agendaType") as string[];
  const agendaDurations = formData.getAll("agendaDuration") as string[];
  const agendaProposalIds = formData.getAll("agendaProposalId") as string[];
  const agendaTopicIds = formData.getAll("agendaTopicId") as string[];

  const agendaValues = agendaTitles
    .map((title, i) => ({
      title: title.trim(),
      description: agendaDescriptions[i]?.trim() || null,
      type: (agendaTypes[i] || "for_discussion") as "for_decision" | "for_discussion" | "for_information",
      sortOrder: i,
      durationMinutes: agendaDurations[i] ? parseInt(agendaDurations[i], 10) || null : null,
      proposalId: agendaProposalIds[i] || null,
      topicId: agendaTopicIds[i] || null,
    }))
    .filter((a) => a.title.length > 0);

  // Atomic: meeting + attendees + agenda items land together.
  await db.transaction(async (tx) => {
    const [meeting] = await tx
      .insert(meetings)
      .values({
        spaceId: space.id,
        title,
        date: new Date(dateStr),
        type,
        status,
        notes,
        isPublic,
        createdBy: user.id,
        facilitatorId: facilitatorId || user.id,
      })
      .returning({ id: meetings.id });

    if (attendeeIds.length > 0) {
      await tx.insert(meetingAttendees).values(
        attendeeIds.map((userId) => ({ meetingId: meeting.id, userId }))
      );
    }

    if (agendaValues.length > 0) {
      await tx.insert(meetingAgendaItems).values(
        agendaValues.map((a) => ({ meetingId: meeting.id, ...a }))
      );
    }

    await persistMeetingCapture(tx, space.id, user.id, meeting.id, new Date(dateStr), formData);
  });

  redirect("/meetings");
}

export async function updateMeeting(meetingId: string, formData: FormData) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  const [existing] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)))
    .limit(1);

  if (!existing) return { error: "Meeting not found" };

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Meeting title is required" };

  const dateStr = formData.get("date") as string;
  if (!dateStr) return { error: "Date is required" };

  const type = (formData.get("type") as string)?.trim() || null;
  const status = ((formData.get("status") as string)?.trim() || "draft") as MeetingStatus;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const facilitatorId = (formData.get("facilitatorId") as string)?.trim() || null;
  const isPublic = formData.get("hideFromPublic") !== "on";
  const attendeeIdsRaw = formData.get("attendeeIds") as string;

  const attendeeIds = attendeeIdsRaw
    ? attendeeIdsRaw.split(",").filter(Boolean)
    : [];

  // Parse agenda items up front.
  const agendaTitles = formData.getAll("agendaTitle") as string[];
  const agendaDescriptions = formData.getAll("agendaDescription") as string[];
  const agendaTypes = formData.getAll("agendaType") as string[];
  const agendaDurations = formData.getAll("agendaDuration") as string[];
  const agendaProposalIds = formData.getAll("agendaProposalId") as string[];
  const agendaTopicIds = formData.getAll("agendaTopicId") as string[];

  const agendaValues = agendaTitles
    .map((title, i) => ({
      title: title.trim(),
      description: agendaDescriptions[i]?.trim() || null,
      type: (agendaTypes[i] || "for_discussion") as "for_decision" | "for_discussion" | "for_information",
      sortOrder: i,
      durationMinutes: agendaDurations[i] ? parseInt(agendaDurations[i], 10) || null : null,
      proposalId: agendaProposalIds[i] || null,
      topicId: agendaTopicIds[i] || null,
    }))
    .filter((a) => a.title.length > 0);

  // Atomic: update + replace attendees + replace agenda (sequential in the tx).
  await db.transaction(async (tx) => {
    await tx
      .update(meetings)
      .set({
        title,
        date: new Date(dateStr),
        type,
        status,
        notes,
        isPublic,
        facilitatorId,
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId));

    await tx.delete(meetingAttendees).where(eq(meetingAttendees.meetingId, meetingId));
    if (attendeeIds.length > 0) {
      await tx.insert(meetingAttendees).values(
        attendeeIds.map((userId) => ({ meetingId, userId }))
      );
    }

    await tx.delete(meetingAgendaItems).where(eq(meetingAgendaItems.meetingId, meetingId));
    if (agendaValues.length > 0) {
      await tx.insert(meetingAgendaItems).values(
        agendaValues.map((a) => ({ meetingId, ...a }))
      );
    }

    await persistMeetingCapture(tx, space.id, user.id, meetingId, new Date(dateStr), formData);
  });

  redirect("/meetings");
}

export async function generateShareLink(meetingId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  const [existing] = await db
    .select({ id: meetings.id, shareToken: meetings.shareToken })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)))
    .limit(1);

  if (!existing) return { error: "Meeting not found" };

  if (existing.shareToken) {
    return { token: existing.shareToken };
  }

  const token = randomUUID().replace(/-/g, "");

  await db
    .update(meetings)
    .set({ shareToken: token })
    .where(eq(meetings.id, meetingId));

  revalidatePath(`/meetings/${meetingId}`);
  return { token };
}

export async function revokeShareLink(meetingId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  await db
    .update(meetings)
    .set({ shareToken: null })
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)));

  revalidatePath(`/meetings/${meetingId}`);
  return { success: true };
}

export async function deleteMeeting(meetingId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  // Fetch meeting for audit snapshot
  const [meeting] = await db
    .select({
      id: meetings.id,
      title: meetings.title,
      date: meetings.date,
      type: meetings.type,
      status: meetings.status,
    })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)))
    .limit(1);

  if (!meeting) return { error: "Meeting not found" };

  // Audit log
  await logDeletion(
    space.id,
    "meeting",
    meeting.title,
    {
      date: meeting.date.toISOString(),
      type: meeting.type,
      status: meeting.status,
    },
    user.id ?? null,
    user.name ?? null
  );

  // Delete — cascades handle attendees, agenda_items, meeting_decisions
  await db
    .delete(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)));

  redirect("/meetings");
}

// Direct DB update for initializing meeting state — safe to call during render
// (no revalidatePath). Used by the live page when a meeting needs state initialized.
// Identity and space are derived server-side: never trust caller-supplied ids.
export async function initializeMeetingState(meetingId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return { error: auth.error };
  const { user, space } = auth;

  // The meeting must belong to the caller's current space.
  const [meeting] = await db
    .select({ id: meetings.id, facilitatorId: meetings.facilitatorId })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)))
    .limit(1);
  if (!meeting) return { error: "Meeting not found" };

  if (!(await canUseLiveMeetings(space.id))) {
    return { error: "Live meetings require a Canopy plan." };
  }

  const facilitatorName = user.name || user.email || "Facilitator";
  const initialState = createInitialState(
    meeting.facilitatorId ?? user.id,
    facilitatorName
  );

  await db
    .update(meetings)
    .set({
      status: "in_progress",
      sessionState: initialState,
      updatedAt: new Date(),
    })
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)));

  await notifyMeetingStarted(
    meetingId,
    space.id,
    user.id,
    user.name || user.email || "Someone"
  );

  return { success: true };
}

export async function startMeeting(meetingId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  const allowed = await canUseLiveMeetings(space.id);
  if (!allowed) return { error: "Live meetings require a Canopy plan." };

  const [meeting] = await db
    .select({ id: meetings.id, status: meetings.status, createdBy: meetings.createdBy })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)))
    .limit(1);

  if (!meeting) return { error: "Meeting not found" };

  const initialState = createInitialState(
    user.id,
    user.name || "Facilitator"
  );

  await db
    .update(meetings)
    .set({
      status: "in_progress",
      sessionState: initialState,
      updatedAt: new Date(),
    })
    .where(eq(meetings.id, meetingId));

  await notifyMeetingStarted(
    meetingId,
    space.id,
    user.id,
    user.name || user.email || "Someone"
  );

  revalidatePath(`/meetings/${meetingId}`);
  return { success: true };
}

export async function importTranscript(data: {
  mode: "new" | "existing";
  meetingId?: string;
  title?: string;
  date?: string;
  type?: string;
  transcript: string;
  saveNotesFromSummary?: boolean;
  summary?: string;
  decisions: {
    title: string;
    description: string;
    method: string;
    outcome: string;
  }[];
  actions: {
    description: string;
    ownerName: string | null;
    dueDate: string | null;
  }[];
  topics: {
    title: string;
    description: string;
    type: string;
  }[];
}) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  let meetingId: string;

  if (data.mode === "new") {
    const [meeting] = await db
      .insert(meetings)
      .values({
        spaceId: space.id,
        title: data.title || "Imported meeting",
        date: data.date ? new Date(data.date) : new Date(),
        type: data.type || "other",
        status: "completed",
        notes: data.saveNotesFromSummary ? data.summary || null : null,
        transcript: data.transcript,
        createdBy: user.id,
        isPublic: true,
      })
      .returning({ id: meetings.id });
    meetingId = meeting.id;
  } else {
    if (!data.meetingId) return { error: "No meeting ID" };
    meetingId = data.meetingId;
    await db
      .update(meetings)
      .set({
        transcript: data.transcript,
        ...(data.saveNotesFromSummary && data.summary
          ? { notes: data.summary }
          : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)));
  }

  // Create decisions and link to meeting
  for (const d of data.decisions) {
    const decision = await insertDecisionWithUniqueNumber(space.id, {
      title: d.title,
      description: d.description,
      method: d.method as
        | "consent"
        | "majority_vote"
        | "advice_process"
        | "delegation"
        | "consensus"
        | "lazy_consensus",
      outcome: d.outcome,
      status: "decided",
      date: new Date(),
      createdBy: user.id,
    });

    await db.insert(meetingDecisions).values({
      meetingId,
      decisionId: decision.id,
    });
  }

  // Create actions and link to meeting
  for (const a of data.actions) {
    const [action] = await db
      .insert(actions)
      .values({
        spaceId: space.id,
        description: a.description,
        ownerName: a.ownerName,
        dueDate: a.dueDate ? new Date(a.dueDate) : null,
        status: "open",
      })
      .returning({ id: actions.id });

    await db.insert(meetingActions).values({
      meetingId,
      actionId: action.id,
    });
  }

  // Create topics
  for (const t of data.topics) {
    await db.insert(topics).values({
      spaceId: space.id,
      title: t.title,
      description: t.description,
      type: t.type as "question" | "tension" | "agenda_suggestion",
      createdBy: user.id,
    });
  }

  revalidatePath("/meetings");
  revalidatePath("/decisions");
  revalidatePath("/actions");
  revalidatePath("/topics");
  revalidatePath(`/meetings/${meetingId}`);

  return { meetingId };
}

export async function addProposalToAgenda(proposalId: string, meetingId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  // Verify meeting belongs to space
  const [meeting] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)))
    .limit(1);
  if (!meeting) return { error: "Meeting not found" };

  // Get proposal title
  const [proposal] = await db
    .select({ id: proposals.id, title: proposals.title })
    .from(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.spaceId, space.id)))
    .limit(1);
  if (!proposal) return { error: "Proposal not found" };

  // Check not already on agenda
  const [existing] = await db
    .select({ id: meetingAgendaItems.id })
    .from(meetingAgendaItems)
    .where(
      and(
        eq(meetingAgendaItems.meetingId, meetingId),
        eq(meetingAgendaItems.proposalId, proposalId)
      )
    )
    .limit(1);
  if (existing) return { error: "Proposal is already on this meeting's agenda" };

  // Get current max sort order
  const agendaRows = await db
    .select({ sortOrder: meetingAgendaItems.sortOrder })
    .from(meetingAgendaItems)
    .where(eq(meetingAgendaItems.meetingId, meetingId));
  const maxSort = agendaRows.length > 0 ? Math.max(...agendaRows.map((r) => r.sortOrder)) : -1;

  await db.insert(meetingAgendaItems).values({
    meetingId,
    title: proposal.title,
    type: "for_decision",
    sortOrder: maxSort + 1,
    proposalId: proposal.id,
  });

  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath(`/proposals/${proposalId}`);
  return { success: true };
}