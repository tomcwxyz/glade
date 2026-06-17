"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and, count } from "drizzle-orm";
import { db } from "@/db";
import { decisions, decisionLinks, decisionReviews, decisionTags, tags, actions, meetingDecisions, meetings, proposals, documentVersions, insights } from "@/db/schema";
import { requireSpaceRole } from "@/lib/space";
import { insertDecisionWithUniqueNumber, getDecisions, syncEntityTags } from "@/lib/queries";
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

  // Atomic: the decision and its tags/actions land together or not at all.
  const decision = await db.transaction(async (tx) => {
    const d = await insertDecisionWithUniqueNumber(
      space.id,
      {
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
      },
      tx
    );

    await syncEntityTags(tx, decisionTags, decisionTags.decisionId, "decisionId", d.id, tagIds);

    if (actionValues.length > 0) {
      await tx.insert(actions).values(
        actionValues.map((a) => ({
          spaceId: space.id,
          decisionId: d.id,
          description: a.description,
          ownerName: a.ownerName,
          dueDate: a.dueDate,
          status: "open" as const,
        }))
      );
    }

    return d;
  });

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

  // Atomic: the update and tag-replace land together.
  await db.transaction(async (tx) => {
    await tx
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

    await syncEntityTags(tx, decisionTags, decisionTags.decisionId, "decisionId", decisionId, tagIds);
  });

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

/**
 * Record the outcome of reviewing a decision. Captures a review-history row and
 * applies the outcome: keep/amend/supersede → status "reviewed"; retire also sets
 * retiredAt; amend/supersede auto-link the decision that replaces/amends this one.
 * Optional learnings are captured on the decision (feeds pattern analysis).
 */
export async function recordDecisionReview(
  decisionId: string,
  outcome: "keep" | "amend" | "supersede" | "retire",
  note?: string,
  learnings?: string,
  linkedDecisionId?: string
) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  const [decision] = await db
    .select({ id: decisions.id })
    .from(decisions)
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id)))
    .limit(1);
  if (!decision) return { error: "Decision not found" };

  // Record the review event (history).
  await db.insert(decisionReviews).values({
    decisionId,
    outcome,
    note: note?.trim() || null,
    reviewedBy: user.id,
  });

  // Apply the outcome to the decision.
  const update: {
    status: "reviewed";
    updatedAt: Date;
    learnings?: string;
    retiredAt?: Date;
  } = { status: "reviewed", updatedAt: new Date() };
  if (learnings && learnings.trim()) update.learnings = learnings.trim();
  if (outcome === "retire") update.retiredAt = new Date();
  await db
    .update(decisions)
    .set(update)
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id)));

  // amend/supersede: link the replacing decision → this one (drives the badge).
  if ((outcome === "amend" || outcome === "supersede") && linkedDecisionId) {
    const [linked] = await db
      .select({ id: decisions.id })
      .from(decisions)
      .where(and(eq(decisions.id, linkedDecisionId), eq(decisions.spaceId, space.id)))
      .limit(1);
    if (linked) {
      const linkType = outcome === "supersede" ? "supersedes" : "amends";
      const [existing] = await db
        .select({ id: decisionLinks.id })
        .from(decisionLinks)
        .where(
          and(
            eq(decisionLinks.fromDecisionId, linkedDecisionId),
            eq(decisionLinks.toDecisionId, decisionId),
            eq(decisionLinks.linkType, linkType)
          )
        );
      if (!existing) {
        await db.insert(decisionLinks).values({
          fromDecisionId: linkedDecisionId,
          toDecisionId: decisionId,
          linkType,
        });
      }
    }
  }

  fireWebhooks(space.id, "decision.status_changed", { id: decisionId, status: "reviewed" });
  revalidatePath(`/decisions`);
  return { success: true };
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

  // Audit log (before the delete; not part of the tx so the record survives).
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

  // Atomic: nullify non-cascading FK references, then delete (cascades handle
  // actions, decision_tags, decision_links, meeting_decisions, section links).
  // Sequential inside the tx — a single connection can't multiplex queries.
  await db.transaction(async (tx) => {
    await tx.update(proposals).set({ decidedAsDecisionId: null }).where(eq(proposals.decidedAsDecisionId, decisionId));
    await tx.update(documentVersions).set({ decisionId: null }).where(eq(documentVersions.decisionId, decisionId));
    await tx.update(insights).set({ relatedDecisionId: null }).where(eq(insights.relatedDecisionId, decisionId));
    await tx.delete(decisions).where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id)));
  });

  redirect("/decisions");
}

/** Page size for the decision log's "load more" (matches the shared PAGE_SIZE). */
const DECISIONS_PAGE_SIZE = 50;

type SerializedDecision = {
  id: string;
  number: number;
  title: string;
  description: string;
  outcome: string;
  method: string;
  status: string;
  participants: string[];
  date: string;
  tags: string[];
  actionsCount: number;
  actionsComplete: number;
};

/**
 * Fetch the next page of decisions for the client-side decision log.
 * Read-only — any space member (observer+) may call it.
 */
export async function loadMoreDecisions(
  offset: number
): Promise<{ decisions: SerializedDecision[]; hasMore: boolean } | { error: string }> {
  const auth = await requireSpaceRole("observer");
  if ("error" in auth) return auth;
  const { space } = auth;

  const rows = await getDecisions(space.id, { limit: DECISIONS_PAGE_SIZE + 1, offset });
  const hasMore = rows.length > DECISIONS_PAGE_SIZE;
  const decisions = rows.slice(0, DECISIONS_PAGE_SIZE).map((d) => ({
    id: d.id,
    number: d.number,
    title: d.title,
    description: d.description || "",
    outcome: d.outcome || "",
    method: d.method,
    status: d.status,
    participants: (d.participants as string[]) || [],
    date: d.date.toISOString(),
    tags: d.tags,
    actionsCount: d.actionsCount,
    actionsComplete: d.actionsComplete,
  }));
  return { decisions, hasMore };
}
