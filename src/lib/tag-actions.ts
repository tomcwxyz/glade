"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { tags } from "@/db/schema";
import { requireSpaceRole } from "@/lib/space";

export async function createTag(name: string, color?: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  const trimmed = name.trim();
  if (!trimmed) return { error: "Tag name is required" };

  const [existing] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.spaceId, space.id), eq(tags.name, trimmed)))
    .limit(1);
  if (existing) return { error: "A tag with that name already exists" };

  await db.insert(tags).values({ spaceId: space.id, name: trimmed, color: color || null });
  revalidatePath("/settings");
  return { success: true };
}

export async function renameTag(tagId: string, name: string, color?: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  const trimmed = name.trim();
  if (!trimmed) return { error: "Tag name is required" };

  const [tag] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.spaceId, space.id)))
    .limit(1);
  if (!tag) return { error: "Tag not found" };

  const [clash] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.spaceId, space.id), eq(tags.name, trimmed)))
    .limit(1);
  if (clash && clash.id !== tagId) {
    return { error: "A tag with that name already exists" };
  }

  await db.update(tags).set({ name: trimmed, color: color ?? null }).where(eq(tags.id, tagId));
  revalidatePath("/settings");
  return { success: true };
}

export async function deleteTag(tagId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  const [tag] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.spaceId, space.id)))
    .limit(1);
  if (!tag) return { error: "Tag not found" };

  // decision_tags rows cascade via FK onDelete.
  await db.delete(tags).where(eq(tags.id, tagId));
  revalidatePath("/settings");
  return { success: true };
}
