"use server";

import { redirect } from "next/navigation";
import { eq, and, count } from "drizzle-orm";
import { db } from "@/db";
import { decisions, decisionLinks, decisionTags, tags, actions, meetingDecisions, meetings, proposals, documentVersions, insights } from "@/db/schema";
import { requireSpaceRole } from "@/lib/space";
import { getNextDecisionNumber } from "@/lib/queries";
import { canAddDecision } from "@/lib/billing";
import { fireWebhooks } from "@/lib/webhooks";
import { logDeletion } from "@/lib/audit";

export async function createDecision(formData: FormData) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  const allowed = await canAddDecision(space.id);
  if (!allowed) return { error: "Decision limit reached. Upgrade to Canopy for unlimited decisions." };

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Title is required" };

  const method = formData.get("method") as string;
  if (!method) return { error: "Decision method is required" };

  const dateStr = formData.get("date") as string;
  if (!dateStr) return { error: "Date is required" };

  const description = (formData.get("description") as string)?.trim() || null;
  const rationale = (formData.get("rationale") as string)?.trim() || null;
  const outcome = (formData.get("outcome") as string)?.trim() || null;
  const conditions = (formData.get("conditions") as string)?.trim() || null;
  const status = (formData.get("status") as string) || "decided";
  const reviewDateStr = formData.get("reviewDate") as string;
  const participantsRaw = formData.get("participants") as string;
  const tagIdsRaw = formData.get("tagIds") as string;

  const participants = participantsRaw
    ? participantsRaw.split(",").map((p) => p.trim()).filter(Boolean)
    : [];

  const tagIds = tagIdsRaw
    ? tagIdsRaw.split(",").filter(Boolean)
    : [];

  const number = await getNextDecisionNumber(space.id);

  const [decision] = await db
    .insert(decisions)
    .values({
      number,
      spaceId: space.id,
      title,
      description,
      rationale,
      method: method as "consent" | "majority_vote" | "advice_process" | "delegation" | "consensus" | "lazy_consensus",
      outcome,
      status: status as "decided" | "implemented" | "reviewed" | "learned",
      participants,
      date: new Date(dateStr),
      conditions,
      reviewDate: reviewDateStr ? new Date(reviewDateStr) : null,
      isPublic: formData.get("hideFromPublic") !== "on",
      createdBy: user.id,
    })
    .returning({ id: decisions.id, number: decisions.number });

  // Add tags
  if (tagIds.length > 0) {
    await db.insert(decisionTags).values(
      tagIds.map((tagId) => ({
        decisionId: decision.id,
        tagId,
      }))
    );
  }

  // Add actions if provided
  const actionDescriptions = formData.getAll("actionDescription") as string[];
  const actionOwners = formData.getAll("actionOwner") as string[];
  const actionDueDates = formData.getAll("actionDueDate") as string[];

  const actionValues = actionDescriptions
    .map((desc, i) => ({
      description: desc.trim(),
      ownerName: actionOwners[i]?.trim() || null,
      dueDate: actionDueDates[i] ? new Date(actionDueDates[i]) : null,
    }))
    .filter((a) => a.description.length > 0);

  if (actionValues.length > 0) {
    await db.insert(actions).values(
      actionValues.map((a) => ({
        spaceId: space.id,
        decisionId: decision.id,
        description: a.description,
        ownerName: a.ownerName,
        dueDate: a.dueDate,
        status: "open" as const,
      }))
    );
  }

  fireWebhooks(space.id, "decision.created", {
    id: decision.id,
    number: decision.number,
    title,
    status,
    method,
  });

  redirect(`/decisions/${decision.number}`);
}

export async function updateDecision(decisionId: string, formData: FormData) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  // Verify the decision belongs to this space
  const [existing] = await db
    .select({ id: decisions.id, number: decisions.number })
    .from(decisions)
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id)))
    .limit(1);

  if (!existing) return { error: "Decision not found" };

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Title is required" };

  const method = formData.get("method") as string;
  if (!method) return { error: "Decision method is required" };

  const dateStr = formData.get("date") as string;
  if (!dateStr) return { error: "Date is required" };

  const description = (formData.get("description") as string)?.trim() || null;
  const rationale = (formData.get("rationale") as string)?.trim() || null;
  const outcome = (formData.get("outcome") as string)?.trim() || null;
  const conditions = (formData.get("conditions") as string)?.trim() || null;
  const status = (formData.get("status") as string) || "decided";
  const reviewDateStr = formData.get("reviewDate") as string;
  const participantsRaw = formData.get("participants") as string;
  const tagIdsRaw = formData.get("tagIds") as string;

  const participants = participantsRaw
    ? participantsRaw.split(",").map((p) => p.trim()).filter(Boolean)
    : [];

  const tagIds = tagIdsRaw
    ? tagIdsRaw.split(",").filter(Boolean)
    : [];

  await db
    .update(decisions)
    .set({
      title,
      description,
      rationale,
      method: method as "consent" | "majority_vote" | "advice_process" | "delegation" | "consensus" | "lazy_consensus",
      outcome,
      status: status as "decided" | "implemented" | "reviewed" | "learned",
      participants,
      date: new Date(dateStr),
      conditions,
      reviewDate: reviewDateStr ? new Date(reviewDateStr) : null,
      isPublic: formData.get("hideFromPublic") !== "on",
      updatedAt: new Date(),
    })
    .where(eq(decisions.id, decisionId));

  // Replace tags
  await db.delete(decisionTags).where(eq(decisionTags.decisionId, decisionId));
  if (tagIds.length > 0) {
    await db.insert(decisionTags).values(
      tagIds.map((tagId) => ({
        decisionId,
        tagId,
      }))
    );
  }

  fireWebhooks(space.id, "decision.updated", {
    id: decisionId,
    number: existing.number,
    title,
    status,
    method,
  });

  redirect(`/decisions/${existing.number}`);
}

export async function updateDecisionStatus(
  decisionId: string,
  status: "decided" | "implemented" | "reviewed" | "learned"
) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  await db
    .update(decisions)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id)));

  fireWebhooks(space.id, "decision.status_changed", {
    id: decisionId,
    status,
  });
}

export async function addDecisionLink(
  fromDecisionId: string,
  toDecisionId: string,
  linkType: "supersedes" | "relates_to" | "amends"
) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  // Verify both decisions belong to this space
  const [from] = await db
    .select({ id: decisions.id })
    .from(decisions)
    .where(and(eq(decisions.id, fromDecisionId), eq(decisions.spaceId, space.id)));
  const [to] = await db
    .select({ id: decisions.id })
    .from(decisions)
    .where(and(eq(decisions.id, toDecisionId), eq(decisions.spaceId, space.id)));

  if (!from || !to) return { error: "Decision not found" };

  // Check for existing link
  const [existing] = await db
    .select({ id: decisionLinks.id })
    .from(decisionLinks)
    .where(
      and(
        eq(decisionLinks.fromDecisionId, fromDecisionId),
        eq(decisionLinks.toDecisionId, toDecisionId)
      )
    );

  if (existing) return { error: "Link already exists" };

  await db.insert(decisionLinks).values({
    fromDecisionId,
    toDecisionId,
    linkType,
  });
}

export async function removeDecisionLink(linkId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  // Verify the link belongs to a decision in the caller's space.
  const [link] = await db
    .select({ id: decisionLinks.id })
    .from(decisionLinks)
    .innerJoin(decisions, eq(decisions.id, decisionLinks.fromDecisionId))
    .where(and(eq(decisionLinks.id, linkId), eq(decisions.spaceId, space.id)))
    .limit(1);

  if (!link) return { error: "Link not found" };
  await db.delete(decisionLinks).where(eq(decisionLinks.id, linkId));
}

export async function linkDecisionToMeeting(
  decisionId: string,
  meetingId: string
) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  // Both the decision and the meeting must belong to the caller's space.
  const [decision] = await db
    .select({ id: decisions.id })
    .from(decisions)
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id)))
    .limit(1);
  if (!decision) return { error: "Decision not found" };

  const [meeting] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)))
    .limit(1);
  if (!meeting) return { error: "Meeting not found" };

  // Check if already linked
  const [existing] = await db
    .select({ meetingId: meetingDecisions.meetingId })
    .from(meetingDecisions)
    .where(
      and(
        eq(meetingDecisions.decisionId, decisionId),
        eq(meetingDecisions.meetingId, meetingId)
      )
    );

  if (existing) return { error: "Already linked" };

  await db.insert(meetingDecisions).values({ meetingId, decisionId });
}

export async function unlinkDecisionFromMeeting(
  decisionId: string,
  meetingId: string
) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  // Verify the decision belongs to the caller's space before unlinking.
  const [decision] = await db
    .select({ id: decisions.id })
    .from(decisions)
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id)))
    .limit(1);
  if (!decision) return { error: "Decision not found" };

  await db
    .delete(meetingDecisions)
    .where(
      and(
        eq(meetingDecisions.decisionId, decisionId),
        eq(meetingDecisions.meetingId, meetingId)
      )
    );
}

export async function deleteDecision(decisionId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  // Fetch decision for audit snapshot
  const [decision] = await db
    .select({
      id: decisions.id,
      number: decisions.number,
      title: decisions.title,
      status: decisions.status,
      method: decisions.method,
      date: decisions.date,
    })
    .from(decisions)
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id)))
    .limit(1);

  if (!decision) return { error: "Decision not found" };

  // Count actions for snapshot
  const [actionCount] = await db
    .select({ count: count() })
    .from(actions)
    .where(eq(actions.decisionId, decisionId));

  // Nullify non-cascading FK references
  await Promise.all([
    db.update(proposals).set({ decidedAsDecisionId: null }).where(eq(proposals.decidedAsDecisionId, decisionId)),
    db.update(documentVersions).set({ decisionId: null }).where(eq(documentVersions.decisionId, decisionId)),
    db.update(insights).set({ relatedDecisionId: null }).where(eq(insights.relatedDecisionId, decisionId)),
  ]);

  // Audit log
  await logDeletion(
    space.id,
    "decision",
    decision.title,
    {
      number: decision.number,
      status: decision.status,
      method: decision.method,
      date: decision.date.toISOString(),
      actionCount: actionCount?.count ?? 0,
    },
    user.id ?? null,
    user.name ?? null
  );

  // Delete — cascades handle actions, decision_tags, decision_links, meeting_decisions, document_section_links
  await db
    .delete(decisions)
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id)));

  redirect("/decisions");
}
