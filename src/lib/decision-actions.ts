"use server";

import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { decisions, decisionLinks, decisionTags, tags, actions, meetingDecisions } from "@/db/schema";
import { getCurrentSpace, requireUser } from "@/lib/space";
import { getNextDecisionNumber } from "@/lib/queries";
import { canAddDecision } from "@/lib/billing";

export async function createDecision(formData: FormData) {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

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
      isPublic: formData.get("isPublic") === "on",
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

  redirect(`/decisions/${decision.number}`);
}

export async function updateDecision(decisionId: string, formData: FormData) {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

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
      isPublic: formData.get("isPublic") === "on",
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

  redirect(`/decisions/${existing.number}`);
}

export async function updateDecisionStatus(
  decisionId: string,
  status: "decided" | "implemented" | "reviewed" | "learned"
) {
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  await db
    .update(decisions)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id)));
}

export async function addDecisionLink(
  fromDecisionId: string,
  toDecisionId: string,
  linkType: "supersedes" | "relates_to" | "amends"
) {
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

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
  await db.delete(decisionLinks).where(eq(decisionLinks.id, linkId));
}

export async function linkDecisionToMeeting(
  decisionId: string,
  meetingId: string
) {
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

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
  await db
    .delete(meetingDecisions)
    .where(
      and(
        eq(meetingDecisions.decisionId, decisionId),
        eq(meetingDecisions.meetingId, meetingId)
      )
    );
}
