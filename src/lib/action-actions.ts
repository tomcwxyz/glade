"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { actions } from "@/db/schema";
import { getCurrentSpace, requireUser } from "@/lib/space";

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
