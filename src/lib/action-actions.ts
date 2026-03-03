"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { actions, decisions } from "@/db/schema";
import { getCurrentSpace, requireUser } from "@/lib/space";
import { logDeletion } from "@/lib/audit";

export async function updateActionStatus(
  actionId: string,
  status: "open" | "in_progress" | "complete" | "overdue"
) {
  await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

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

export async function deleteAction(actionId: string) {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  // Fetch action with linked decision number for audit snapshot
  const [action] = await db
    .select({
      id: actions.id,
      description: actions.description,
      ownerName: actions.ownerName,
      status: actions.status,
      decisionId: actions.decisionId,
      decisionNumber: decisions.number,
    })
    .from(actions)
    .innerJoin(decisions, eq(actions.decisionId, decisions.id))
    .where(and(eq(actions.id, actionId), eq(actions.spaceId, space.id)))
    .limit(1);

  if (!action) return { error: "Action not found" };

  // Audit log
  await logDeletion(
    space.id,
    "action",
    action.description,
    {
      ownerName: action.ownerName,
      status: action.status,
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
  revalidatePath("/dashboard");
}
