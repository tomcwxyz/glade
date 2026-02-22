"use server";

import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { webhooks } from "@/db/schema";
import { getCurrentSpace, requireUser } from "@/lib/space";
import { getSpaceMembers } from "@/lib/queries";

async function requireAdmin() {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) throw new Error("No space selected");

  const members = await getSpaceMembers(space.id);
  const member = members.find((m) => m.userId === user.id);
  if (!member || member.role !== "admin") throw new Error("Admin access required");

  return { user, space };
}

export async function createWebhook(formData: FormData) {
  const { space } = await requireAdmin();

  const url = (formData.get("url") as string)?.trim();
  if (!url) return { error: "URL is required" };

  try {
    new URL(url);
  } catch {
    return { error: "Invalid URL" };
  }

  const eventsRaw = formData.get("events") as string;
  const events = eventsRaw
    ? eventsRaw.split(",").filter(Boolean)
    : ["decision.created", "decision.updated", "decision.status_changed"];

  const secret = crypto.randomBytes(32).toString("hex");

  await db.insert(webhooks).values({
    spaceId: space.id,
    url,
    secret,
    events,
  });

  revalidatePath("/settings");
  return { success: true, secret };
}

export async function deleteWebhook(webhookId: string): Promise<{ success: true } | { error: string }> {
  try {
    const { space } = await requireAdmin();

    await db
      .delete(webhooks)
      .where(and(eq(webhooks.id, webhookId), eq(webhooks.spaceId, space.id)));

    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function toggleWebhook(webhookId: string, active: boolean) {
  const { space } = await requireAdmin();

  await db
    .update(webhooks)
    .set({ active })
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.spaceId, space.id)));

  revalidatePath("/settings");
  return { success: true };
}
