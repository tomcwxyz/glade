"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { requireUser } from "@/lib/space";
import { isSuperAdmin } from "@/lib/auth";
import { getSpaceSubscription } from "@/lib/queries";
import type { PlanTier } from "@/lib/plans";

async function requireSuperAdmin() {
  const user = await requireUser();
  if (!isSuperAdmin(user.email)) {
    throw new Error("Not authorised");
  }
  return user;
}

export async function setSpacePlan(spaceId: string, planTier: PlanTier) {
  await requireSuperAdmin();

  const existing = await getSpaceSubscription(spaceId);

  if (existing) {
    await db
      .update(subscriptions)
      .set({ planTier, status: "active", updatedAt: new Date() })
      .where(eq(subscriptions.id, existing.id));
  } else {
    await db.insert(subscriptions).values({
      spaceId,
      planTier,
      status: "active",
    });
  }

  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { success: true };
}
