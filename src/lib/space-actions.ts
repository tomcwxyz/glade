"use server";

import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { spaces, spaceMembers, users } from "@/db/schema";
import { getCurrentSpace, requireUser, setCurrentSpace } from "@/lib/space";

export async function updateSpace(formData: FormData) {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  // Verify admin role
  const [membership] = await db
    .select({ role: spaceMembers.role })
    .from(spaceMembers)
    .where(
      and(eq(spaceMembers.spaceId, space.id), eq(spaceMembers.userId, user.id))
    );

  if (membership?.role !== "admin") return { error: "Only admins can update space settings" };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Space name is required" };

  const description = (formData.get("description") as string)?.trim() || null;

  await db
    .update(spaces)
    .set({ name, description, updatedAt: new Date() })
    .where(eq(spaces.id, space.id));

  redirect("/settings");
}

export async function deleteSpace() {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  // Verify admin role
  const [membership] = await db
    .select({ role: spaceMembers.role })
    .from(spaceMembers)
    .where(
      and(eq(spaceMembers.spaceId, space.id), eq(spaceMembers.userId, user.id))
    );

  if (membership?.role !== "admin") return { error: "Only admins can delete a space" };

  // Cascade delete handles children
  await db.delete(spaces).where(eq(spaces.id, space.id));

  // Find another space for this user
  const [nextSpace] = await db
    .select({ slug: spaces.slug })
    .from(spaces)
    .innerJoin(spaceMembers, eq(spaceMembers.spaceId, spaces.id))
    .where(eq(spaceMembers.userId, user.id))
    .limit(1);

  if (nextSpace) {
    await setCurrentSpace(nextSpace.slug);
    redirect("/dashboard");
  } else {
    redirect("/new-space");
  }
}

export async function updateMemberRole(
  memberId: string,
  role: "admin" | "member" | "observer"
) {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  // Verify the acting user is admin
  const [actingMembership] = await db
    .select({ role: spaceMembers.role })
    .from(spaceMembers)
    .where(
      and(eq(spaceMembers.spaceId, space.id), eq(spaceMembers.userId, user.id))
    );

  if (actingMembership?.role !== "admin") return { error: "Only admins can change roles" };

  await db
    .update(spaceMembers)
    .set({ role })
    .where(and(eq(spaceMembers.id, memberId), eq(spaceMembers.spaceId, space.id)));
}

export async function removeMember(memberId: string) {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  // Verify admin
  const [actingMembership] = await db
    .select({ role: spaceMembers.role })
    .from(spaceMembers)
    .where(
      and(eq(spaceMembers.spaceId, space.id), eq(spaceMembers.userId, user.id))
    );

  if (actingMembership?.role !== "admin") return { error: "Only admins can remove members" };

  // Don't allow removing yourself
  const [targetMembership] = await db
    .select({ userId: spaceMembers.userId })
    .from(spaceMembers)
    .where(eq(spaceMembers.id, memberId));

  if (targetMembership?.userId === user.id) {
    return { error: "You cannot remove yourself from the space" };
  }

  await db
    .delete(spaceMembers)
    .where(and(eq(spaceMembers.id, memberId), eq(spaceMembers.spaceId, space.id)));
}

export async function inviteMember(email: string) {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  // Verify admin
  const [actingMembership] = await db
    .select({ role: spaceMembers.role })
    .from(spaceMembers)
    .where(
      and(eq(spaceMembers.spaceId, space.id), eq(spaceMembers.userId, user.id))
    );

  if (actingMembership?.role !== "admin") return { error: "Only admins can invite members" };

  // Check if user exists
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()));

  if (!existingUser) {
    return { error: "No account found with that email. They need to sign up first." };
  }

  // Check if already a member
  const [existingMembership] = await db
    .select({ id: spaceMembers.id })
    .from(spaceMembers)
    .where(
      and(
        eq(spaceMembers.spaceId, space.id),
        eq(spaceMembers.userId, existingUser.id)
      )
    );

  if (existingMembership) return { error: "This person is already a member of this space" };

  // Add as member
  await db.insert(spaceMembers).values({
    spaceId: space.id,
    userId: existingUser.id,
    role: "member",
  });

  return { success: true };
}
