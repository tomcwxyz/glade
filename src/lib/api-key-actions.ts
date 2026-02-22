"use server";

import { randomBytes, createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, spaceMembers } from "@/db/schema";
import { getCurrentSpace, requireUser } from "@/lib/space";

/**
 * Verify the current user is an admin of the current space.
 */
async function requireAdmin() {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" as const };

  const [membership] = await db
    .select({ role: spaceMembers.role })
    .from(spaceMembers)
    .where(
      and(eq(spaceMembers.spaceId, space.id), eq(spaceMembers.userId, user.id))
    )
    .limit(1);

  if (!membership || membership.role !== "admin") {
    return { error: "Admin access required" as const };
  }

  return { user, space };
}

/**
 * Create a new API key. Returns the full key ONCE — it cannot be retrieved later.
 * Key format: glade_ + 40 hex characters
 */
export async function createApiKey(formData: FormData) {
  const result = await requireAdmin();
  if ("error" in result) return { error: result.error };
  const { space } = result;

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Key name is required" };

  const permissions = (formData.get("permissions") as string) || "read";
  if (!["read", "read_write"].includes(permissions)) {
    return { error: "Invalid permissions value" };
  }

  const expiresAtStr = formData.get("expiresAt") as string;
  const expiresAt = expiresAtStr ? new Date(expiresAtStr) : null;

  // Generate key: glade_ + 40 random hex characters
  const key = `glade_${randomBytes(20).toString("hex")}`;
  const keyHash = createHash("sha256").update(key).digest("hex");
  const keyPrefix = key.slice(0, 12); // "glade_XXXXXX"

  await db.insert(apiKeys).values({
    spaceId: space.id,
    name,
    keyHash,
    keyPrefix,
    permissions,
    expiresAt,
  });

  revalidatePath("/settings");
  return { success: true, key };
}

/**
 * Delete an API key by ID. Requires admin role.
 */
export async function deleteApiKey(keyId: string) {
  const result = await requireAdmin();
  if ("error" in result) return { error: result.error };
  const { space } = result;

  // Verify key belongs to this space
  const [existing] = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.spaceId, space.id)))
    .limit(1);

  if (!existing) return { error: "API key not found" };

  await db.delete(apiKeys).where(eq(apiKeys.id, keyId));

  revalidatePath("/settings");
  return { success: true };
}
