"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/space";

/**
 * Update the current user's display name. Email is identity (sign-in) and stays
 * read-only here — changing it would need a re-verification flow.
 */
export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name is required" };

  await db
    .update(users)
    .set({ name, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  revalidatePath("/account");
  // Name shown in the session token updates on next sign-in.
  return { success: "Profile updated." };
}
