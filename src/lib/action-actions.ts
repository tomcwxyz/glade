"use server";

import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { actions, actionOwners, actionTags, spaceMembers, decisions, topics, proposals } from "@/db/schema";
import { requireSpaceRole } from "@/lib/space";
import { syncEntityTags } from "@/lib/queries";
import { logDeletion } from "@/lib/audit";

/** Keep only the user ids that are actually members of the space. */
async function validateOwnerIds(spaceId: string, userIds?: string[]): Promise<string[]> {
  if (!userIds || userIds.length === 0) return [];
  const members = await db
    .select({ userId: spaceMembers.userId })
    .from(spaceMembers)
    .where(and(eq(spaceMembers.spaceId, spaceId), inArray(spaceMembers.userId, userIds)));
  return members.map((m) => m.userId);
}

export async function createAction(
  parentType: "decision" | "topic" | "proposal",
  parentId: string,
  description: string,
  ownerName?: string,
  dueDate?: string,
  ownerUserIds?: string[],
  tagIds?: string[]
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

  const ownerIds = await validateOwnerIds(space.id, ownerUserIds);

  // Atomic: the action and its member owners land together.
  await db.transaction(async (tx) => {
    const [action] = await tx
      .insert(actions)
      .values({
        spaceId: space.id,
        decisionId: parentType === "decision" ? parentId : null,
        topicId: parentType === "topic" ? parentId : null,
        proposalId: parentType === "proposal" ? parentId : null,
        description: description.trim(),
        ownerName: ownerName?.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "open",
      })
      .returning({ id: actions.id });

    if (ownerIds.length > 0) {
      await tx.insert(actionOwners).values(
        ownerIds.map((userId) => ({ actionId: action.id, userId }))
      );
    }

    await syncEntityTags(tx, actionTags, actionTags.actionId, "actionId", action.id, tagIds ?? []);
  });

  revalidatePath("/actions");
  if (parentType === "decision") revalidatePath("/decisions");
  if (parentType === "topic") revalidatePath(`/topics/${parentId}`);
  if (parentType === "proposal") revalidatePath(`/proposals/${parentId}`);
  revalidatePath("/dashboard");
}

/** Editable snapshot of an action — the list folds owners into one display
 *  string, so the edit dialog lazy-loads structured fields instead. */
export async function getActionForEdit(actionId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  const [row] = await db
    .select({
      description: actions.description,
      ownerName: actions.ownerName,
      dueDate: actions.dueDate,
    })
    .from(actions)
    .where(and(eq(actions.id, actionId), eq(actions.spaceId, space.id)))
    .limit(1);

  if (!row) return { error: "Action not found" };

  const [owners, tagRows] = await Promise.all([
    db
      .select({ userId: actionOwners.userId })
      .from(actionOwners)
      .where(eq(actionOwners.actionId, actionId)),
    db
      .select({ tagId: actionTags.tagId })
      .from(actionTags)
      .where(eq(actionTags.actionId, actionId)),
  ]);

  return {
    description: row.description,
    ownerName: row.ownerName ?? "",
    dueDate: row.dueDate ? row.dueDate.toISOString().split("T")[0] : "",
    ownerUserIds: owners.map((o) => o.userId),
    tagIds: tagRows.map((t) => t.tagId),
  };
}

export async function updateAction(
  actionId: string,
  description: string,
  ownerName?: string,
  dueDate?: string,
  ownerUserIds?: string[],
  tagIds?: string[]
) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  if (!description.trim()) return { error: "Description is required" };

  const [existing] = await db
    .select({ id: actions.id })
    .from(actions)
    .where(and(eq(actions.id, actionId), eq(actions.spaceId, space.id)))
    .limit(1);

  if (!existing) return { error: "Action not found" };

  const ownerIds = await validateOwnerIds(space.id, ownerUserIds);

  // Atomic: the row update, its member owners, and its tags change together.
  await db.transaction(async (tx) => {
    await tx
      .update(actions)
      .set({
        description: description.trim(),
        ownerName: ownerName?.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        updatedAt: new Date(),
      })
      .where(eq(actions.id, actionId));

    await tx.delete(actionOwners).where(eq(actionOwners.actionId, actionId));
    if (ownerIds.length > 0) {
      await tx.insert(actionOwners).values(
        ownerIds.map((userId) => ({ actionId, userId }))
      );
    }

    await syncEntityTags(tx, actionTags, actionTags.actionId, "actionId", actionId, tagIds ?? []);
  });

  revalidatePath("/actions");
  revalidatePath("/dashboard");
  return { success: true };
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
