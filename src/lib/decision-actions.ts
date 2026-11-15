"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and, count, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { decisions, decisionLinks, decisionReviews, decisionRevisions, decisionTags, tags, actions, meetingDecisions, meetings } from "@/db/schema";
import { decisionNotDeleted } from "@/lib/soft-delete";
import { requireSpaceRole } from "@/lib/space";
import {
  insertDecisionWithUniqueNumber,
  getDecisions,
  syncEntityTags,
  getSpaceMemberRefs,
  getDecisionParticipants,
  replaceDecisionParticipants,
  isMeetingMinutesLocked,
  MINUTES_LOCKED_ERROR,
} from "@/lib/queries";
import { parseParticipantsField, participantSummaries, resolveParticipants } from "@/lib/participants";
import { canAddDecision } from "@/lib/billing";
import { fireWebhooks } from "@/lib/webhooks";
import { logDeletion } from "@/lib/audit";
import { diffDecision, type DecisionSnapshot } from "@/lib/decision-revisions";
import { canTransitionManually, initialStatus, isDecisionStatus, statusAfterReview, type DecisionStatus } from "@/lib/decision-lifecycle";

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
  // A new decision starts as decided (or implemented, when recording past work);
  // later stages come from the lifecycle, never from the form.
  const status = initialStatus(formData.get("status"));
  const reviewDateStr = formData.get("reviewDate") as string;
  const tagIdsRaw = formData.get("tagIds") as string;

  // Members (linked) or guests, with how each took part and any declared interest.
  const participantInputs = parseParticipantsField(formData.get("participants"));

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
        status,
        date: new Date(dateStr),
        conditions,
        reviewDate: reviewDateStr ? new Date(reviewDateStr) : null,
        isPublic: formData.get("hideFromPublic") !== "on",
        createdBy: user.id,
      },
      tx
    );

    await syncEntityTags(tx, decisionTags, decisionTags.decisionId, "decisionId", d.id, tagIds);
    await replaceDecisionParticipants(tx, space.id, d.id, participantInputs);

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
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id), decisionNotDeleted))
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
  // Status is not editable here: it only moves forward via the lifecycle.
  const status = existing.status;
  const reviewDateStr = formData.get("reviewDate") as string;
  const tagIdsRaw = formData.get("tagIds") as string;

  // Members (linked) or guests, with how each took part and any declared interest.
  const participantInputs = parseParticipantsField(formData.get("participants"));

  const tagIds = tagIdsRaw
    ? tagIdsRaw.split(",").filter(Boolean)
    : [];

  const revisionReason = (formData.get("revisionReason") as string)?.trim() || "";

  // Tag names (scoped to this space) for the before/after snapshots.
  const tagNames = async (ids: string[]) =>
    ids.length === 0
      ? []
      : (
          await db
            .select({ name: tags.name })
            .from(tags)
            .where(and(inArray(tags.id, ids), eq(tags.spaceId, space.id)))
        ).map((t) => t.name);
  const currentTagIds = (
    await db.select({ tagId: decisionTags.tagId }).from(decisionTags).where(eq(decisionTags.decisionId, decisionId))
  ).map((t) => t.tagId);

  const isPublic = formData.get("hideFromPublic") !== "on";
  const members = await getSpaceMemberRefs(space.id);
  const newParticipants = resolveParticipants(participantInputs, members);
  const before: DecisionSnapshot = {
    title: existing.title,
    description: existing.description,
    rationale: existing.rationale,
    outcome: existing.outcome,
    method: existing.method,
    participants: participantSummaries(await getDecisionParticipants(decisionId)),
    date: existing.date,
    conditions: existing.conditions,
    reviewDate: existing.reviewDate,
    isPublic: existing.isPublic,
    tags: await tagNames(currentTagIds),
  };
  const after: DecisionSnapshot = {
    title,
    description,
    rationale,
    outcome,
    method,
    participants: participantSummaries(newParticipants),
    date: new Date(dateStr),
    conditions,
    reviewDate: reviewDateStr ? new Date(reviewDateStr) : null,
    isPublic,
    tags: await tagNames(tagIds),
  };
  const changes = diffDecision(before, after);

  // Nothing changed: no write, no revision.
  if (Object.keys(changes).length === 0) redirect(`/decisions/${existing.number}`);

  // The record is append-only in spirit: every correction says why.
  if (!revisionReason) return { error: "Say why you are correcting this record" };

  // Atomic: the update, tag-replace and revision entry land together.
  await db.transaction(async (tx) => {
    await tx.insert(decisionRevisions).values({
      decisionId,
      changes,
      reason: revisionReason,
      revisedBy: user.id,
      revisedByName: user.name ?? user.email ?? null,
    });

    await tx
      .update(decisions)
      .set({
        title,
        description,
        rationale,
        method: method as "consent" | "majority_vote" | "advice_process" | "delegation" | "consensus" | "lazy_consensus",
        outcome,
        date: new Date(dateStr),
        conditions,
        reviewDate: reviewDateStr ? new Date(reviewDateStr) : null,
        isPublic,
        updatedAt: new Date(),
      })
      .where(eq(decisions.id, decisionId));

    await syncEntityTags(tx, decisionTags, decisionTags.decisionId, "decisionId", decisionId, tagIds);
    await replaceDecisionParticipants(tx, space.id, decisionId, newParticipants, members);
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
  status: DecisionStatus
) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  if (!isDecisionStatus(status)) return { error: "Unknown status" };

  const [current] = await db
    .select({ status: decisions.status, learnings: decisions.learnings })
    .from(decisions)
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id), decisionNotDeleted))
    .limit(1);
  if (!current) return { error: "Decision not found" };

  // Forward-only; "reviewed" comes from recording a review, "learned" needs learnings.
  if (!canTransitionManually(current.status, status, { hasLearnings: !!current.learnings?.trim() })) {
    return { error: `A ${current.status} decision can't be moved to ${status} directly` };
  }

  // Conditional on the status we checked, so two concurrent clicks can't skip a stage.
  const moved = await db.transaction(async (tx) => {
    const rows = await tx
      .update(decisions)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id), eq(decisions.status, current.status)))
      .returning({ id: decisions.id });
    if (rows.length === 0) return false;
    await tx.insert(decisionRevisions).values({
      decisionId,
      changes: { status: { from: current.status, to: status } },
      reason: `Marked ${status}`,
      revisedBy: user.id,
      revisedByName: user.name ?? user.email ?? null,
    });
    return true;
  });
  if (!moved) return { error: "This decision was updated by someone else. Refresh and try again." };

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
    .select({ id: decisions.id, status: decisions.status })
    .from(decisions)
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id), decisionNotDeleted))
    .limit(1);
  if (!decision) return { error: "Decision not found" };
  const newStatus = statusAfterReview(decision.status);

  // Record the review event (history).
  await db.insert(decisionReviews).values({
    decisionId,
    outcome,
    note: note?.trim() || null,
    reviewedBy: user.id,
  });

  // Apply the outcome to the decision.
  const update: {
    status: DecisionStatus;
    updatedAt: Date;
    learnings?: string;
    retiredAt?: Date;
  } = { status: newStatus, updatedAt: new Date() };
  if (learnings && learnings.trim()) update.learnings = learnings.trim();
  if (outcome === "retire") update.retiredAt = new Date();
  await db
    .update(decisions)
    .set(update)
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id), decisionNotDeleted));

  // amend/supersede: link the replacing decision → this one (drives the badge).
  if ((outcome === "amend" || outcome === "supersede") && linkedDecisionId) {
    const [linked] = await db
      .select({ id: decisions.id })
      .from(decisions)
      .where(and(eq(decisions.id, linkedDecisionId), eq(decisions.spaceId, space.id), decisionNotDeleted))
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

  fireWebhooks(space.id, "decision.status_changed", { id: decisionId, status: newStatus });
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
    .where(and(eq(decisions.id, fromDecisionId), eq(decisions.spaceId, space.id), decisionNotDeleted));
  const [to] = await db
    .select({ id: decisions.id })
    .from(decisions)
    .where(and(eq(decisions.id, toDecisionId), eq(decisions.spaceId, space.id), decisionNotDeleted));

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
    .innerJoin(decisions, and(eq(decisions.id, decisionLinks.fromDecisionId), decisionNotDeleted))
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
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id), decisionNotDeleted))
    .limit(1);
  if (!decision) return { error: "Decision not found" };

  const [meeting] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)))
    .limit(1);
  if (!meeting) return { error: "Meeting not found" };
  if (await isMeetingMinutesLocked(meetingId, space.id)) return { error: MINUTES_LOCKED_ERROR };

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
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id), decisionNotDeleted))
    .limit(1);
  if (!decision) return { error: "Decision not found" };
  if (await isMeetingMinutesLocked(meetingId, space.id)) return { error: MINUTES_LOCKED_ERROR };

  await db
    .delete(meetingDecisions)
    .where(
      and(
        eq(meetingDecisions.decisionId, decisionId),
        eq(meetingDecisions.meetingId, meetingId)
      )
    );
}

/**
 * Soft-delete a decision (admins only). The record is hidden from every view
 * but kept, with who/when/why, so an admin can see and restore it. Nothing
 * linked to it (actions, links, reviews, deliberation) is destroyed.
 */
export async function deleteDecision(decisionId: string, reason: string) {
  const auth = await requireSpaceRole("admin");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  const trimmedReason = reason?.trim();
  if (!trimmedReason) return { error: "Give a reason for deleting this decision" };

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
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id), decisionNotDeleted))
    .limit(1);

  if (!decision) return { error: "Decision not found" };

  const [actionCount] = await db
    .select({ count: count() })
    .from(actions)
    .where(eq(actions.decisionId, decisionId));

  const deletedByName = user.name ?? user.email ?? null;

  await db
    .update(decisions)
    .set({ deletedAt: new Date(), deletedBy: user.id, deletedByName, deletionReason: trimmedReason })
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id), decisionNotDeleted));

  // Activity log entry (settings page), linking back to the restorable record.
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
      reason: trimmedReason,
      soft: true,
    },
    user.id ?? null,
    deletedByName
  );

  revalidatePath("/decisions");
  redirect("/decisions");
}

/** Restore a soft-deleted decision (admins only). Logged as a revision. */
export async function restoreDecision(decisionId: string) {
  const auth = await requireSpaceRole("admin");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  const [decision] = await db
    .select({ id: decisions.id, number: decisions.number, deletionReason: decisions.deletionReason })
    .from(decisions)
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id), isNotNull(decisions.deletedAt)))
    .limit(1);
  if (!decision) return { error: "Deleted decision not found" };

  await db.transaction(async (tx) => {
    await tx
      .update(decisions)
      .set({ deletedAt: null, deletedBy: null, deletedByName: null, deletionReason: null })
      .where(eq(decisions.id, decisionId));
    await tx.insert(decisionRevisions).values({
      decisionId,
      changes: { deleted: { from: true, to: false } },
      reason: `Restored (had been deleted: ${decision.deletionReason ?? "no reason given"})`,
      revisedBy: user.id,
      revisedByName: user.name ?? user.email ?? null,
    });
  });

  revalidatePath("/decisions");
  revalidatePath(`/decisions/${decision.number}`);
  return { success: true };
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
