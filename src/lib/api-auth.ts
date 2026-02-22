import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { NextRequest } from "next/server";

export type ApiKeyAuth = {
  spaceId: string;
  permissions: string;
};

/**
 * Authenticate an API request using a Bearer token from the Authorization header.
 * Returns { spaceId, permissions } on success, or null if the key is invalid/expired.
 */
export async function authenticateApiKey(
  request: NextRequest
): Promise<ApiKeyAuth | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  if (!token.startsWith("glade_")) return null;

  // Hash the token with SHA-256 to match stored hash
  const keyHash = crypto.createHash("sha256").update(token).digest("hex");

  // Look up by hash
  const [key] = await db
    .select({
      id: apiKeys.id,
      spaceId: apiKeys.spaceId,
      permissions: apiKeys.permissions,
      expiresAt: apiKeys.expiresAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!key) return null;

  // Check expiry
  if (key.expiresAt && key.expiresAt < new Date()) return null;

  // Update lastUsedAt (fire-and-forget, don't block the response)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id))
    .then(() => {})
    .catch(() => {});

  return {
    spaceId: key.spaceId,
    permissions: key.permissions,
  };
}
