"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/db";
import {
  meetings,
  meetingAgendaItems,
  meetingAttendees,
  meetingDecisions,
  meetingActions,
  decisions,
  actions,
  topics,
  proposals,
} from "@/db/schema";
import { getCurrentSpace, requireUser, requireSpaceRole } from "@/lib/space";
import { createInitialState } from "@/lib/meeting-state";
import { canUseLiveMeetings } from "@/lib/billing";
import { logDeletion } from "@/lib/audit";
import { getNextDecisionNumber } from "@/lib/queries";

type MeetingStatus = "draft" | "scheduled" | "in_progress" | "completed";

export async function createMeeting(formData: FormData) {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

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

  const [meeting] = await db
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

  // Add attendees
  if (attendeeIds.length > 0) {
    await db.insert(meetingAttendees).values(
      attendeeIds.map((userId) => ({
        meetingId: meeting.id,
        userId,
      }))
    );
  }

  // Add agenda items
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

  if (agendaValues.length > 0) {
    await db.insert(meetingAgendaItems).values(
      agendaValues.map((a) => ({
        meetingId: meeting.id,
        title: a.title,
        description: a.description,
        type: a.type,
        sortOrder: a.sortOrder,
        durationMinutes: a.durationMinutes,
        proposalId: a.proposalId,
        topicId: a.topicId,
      }))
    );
  }

  redirect("/meetings");
}

export async function updateMeeting(meetingId: string, formData: FormData) {
  await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

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

  await db
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

  // Replace attendees
  await db.delete(meetingAttendees).where(eq(meetingAttendees.meetingId, meetingId));
  if (attendeeIds.length > 0) {
    await db.insert(meetingAttendees).values(
      attendeeIds.map((userId) => ({
        meetingId,
        userId,
      }))
    );
  }

  // Replace agenda items
  await db.delete(meetingAgendaItems).where(eq(meetingAgendaItems.meetingId, meetingId));
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

  if (agendaValues.length > 0) {
    await db.insert(meetingAgendaItems).values(
      agendaValues.map((a) => ({
        meetingId,
        title: a.title,
        description: a.description,
        type: a.type,
        sortOrder: a.sortOrder,
        durationMinutes: a.durationMinutes,
        proposalId: a.proposalId,
        topicId: a.topicId,
      }))
    );
  }

  redirect("/meetings");
}

export async function generateShareLink(meetingId: string) {
  await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

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
  await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  await db
    .update(meetings)
    .set({ shareToken: null })
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)));

  revalidatePath(`/meetings/${meetingId}`);
  return { success: true };
}

export async function deleteMeeting(meetingId: string) {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

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

  return { success: true };
}

export async function startMeeting(meetingId: string) {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

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
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

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
    const nextNumber = await getNextDecisionNumber(space.id);
    const [decision] = await db
      .insert(decisions)
      .values({
        spaceId: space.id,
        number: nextNumber,
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
      })
      .returning({ id: decisions.id });

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
  await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

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