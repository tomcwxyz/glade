"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { actions, decisions, topics, proposals } from "@/db/schema";
import { requireSpaceRole } from "@/lib/space";
import { logDeletion } from "@/lib/audit";

export async function createAction(
  parentType: "decision" | "topic" | "proposal",
  parentId: string,
  description: string,
  ownerName?: string,
  dueDate?: string
) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  if (!description.trim()) return { error: "Description is required" };

  // Validate parent exists in current space
  if (parentType === "decision") {
    const [d] = await db.select({ id: decisions.id }).from(decisions)
      .where(and(eq(decisions.id, parentId), eq(decisions.spaceId, space.id))).limit(1);
    if (!d) return { error: "Decision not found" };
  } else if (parentType === "topic") {
    const [t] = await db.select({ id: topics.id }).from(topics)
      .where(and(eq(topics.id, parentId), eq(topics.spaceId, space.id))).limit(1);
    if (!t) return { error: "Topic not found" };
  } else {
    const [p] = await db.select({ id: proposals.id }).from(proposals)
      .where(and(eq(proposals.id, parentId), eq(proposals.spaceId, space.id))).limit(1);
    if (!p) return { error: "Proposal not found" };
  }

  await db.insert(actions).values({
    spaceId: space.id,
    decisionId: parentType === "decision" ? parentId : null,
    topicId: parentType === "topic" ? parentId : null,
    proposalId: parentType === "proposal" ? parentId : null,
    description: description.trim(),
    ownerName: ownerName?.trim() || null,
    dueDate: dueDate ? new Date(dueDate) : null,
    status: "open",
  });

  revalidatePath("/actions");
  if (parentType === "decision") revalidatePath("/decisions");
  if (parentType === "topic") revalidatePath(`/topics/${parentId}`);
  if (parentType === "proposal") revalidatePath(`/proposals/${parentId}`);
  revalidatePath("/dashboard");
}

export async function updateActionStatus(
  actionId: string,
  status: "open" | "in_progress" | "complete" | "overdue"
) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  const [existing] = await db
    .select({ id: actions.id })
    .from(actions)
    .where(and(eq(actions.id, actionId), eq(actions.spaceId, space.id)))
    .limit(1);

  if (!existing) return { error: "Action not found" };

  await db
    .update(actions)
    .set({
      status,
      completedAt: status === "complete" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(actions.id, actionId));

  revalidatePath("/actions");
  revalidatePath("/dashboard");
}

/** Toggle whether an action appears on the space's public actions page. */
export async function setActionPublic(actionId: string, isPublic: boolean) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  await db
    .update(actions)
    .set({ isPublic, updatedAt: new Date() })
    .where(and(eq(actions.id, actionId), eq(actions.spaceId, space.id)));

  revalidatePath("/actions");
  return { success: true };
}

export async function deleteAction(actionId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  // Fetch action with linked parent for audit snapshot
  const [action] = await db
    .select({
      id: actions.id,
      description: actions.description,
      ownerName: actions.ownerName,
      status: actions.status,
      decisionId: actions.decisionId,
      topicId: actions.topicId,
      proposalId: actions.proposalId,
      decisionNumber: decisions.number,
      topicTitle: topics.title,
      proposalTitle: proposals.title,
    })
    .from(actions)
    .leftJoin(decisions, eq(actions.decisionId, decisions.id))
    .leftJoin(topics, eq(actions.topicId, topics.id))
    .leftJoin(proposals, eq(actions.proposalId, proposals.id))
    .where(and(eq(actions.id, actionId), eq(actions.spaceId, space.id)))
    .limit(1);

  if (!action) return { error: "Action not found" };

  // Determine parent context for audit
  const parentType = action.decisionId ? "decision" : action.topicId ? "topic" : action.proposalId ? "proposal" : null;
  const parentTitle = action.decisionNumber
    ? `Decision #${action.decisionNumber}`
    : action.topicTitle
      ? `Topic: ${action.topicTitle}`
      : action.proposalTitle
        ? `Proposal: ${action.proposalTitle}`
        : null;

  // Audit log
  await logDeletion(
    space.id,
    "action",
    action.description,
    {
      ownerName: action.ownerName,
      status: action.status,
      parentType,
      parentTitle,
      decisionNumber: action.decisionNumber,
    },
    user.id ?? null,
    user.name ?? null
  );

  await db
    .delete(actions)
    .where(and(eq(actions.id, actionId), eq(actions.spaceId, space.id)));

  revalidatePath("/actions");
  revalidatePath("/decisions");
  revalidatePath("/topics");
  revalidatePath("/proposals");
  revalidatePath("/dashboard");
}
