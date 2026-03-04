"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { spaces, spaceMembers, users } from "@/db/schema";
import { getCurrentSpace, requireUser, setCurrentSpace } from "@/lib/space";
import { canAddMember } from "@/lib/billing";
import { randomBytes } from "crypto";
import { invitations } from "@/db/schema";
import { sendSpaceInviteEmail, sendAddedToSpaceEmail, isEmailConfigured } from "@/lib/email";

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

export async function updateSpaceSettings(settings: Record<string, unknown>) {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  // Verify admin
  const [membership] = await db
    .select({ role: spaceMembers.role })
    .from(spaceMembers)
    .where(
      and(eq(spaceMembers.spaceId, space.id), eq(spaceMembers.userId, user.id))
    );

  if (membership?.role !== "admin") return { error: "Only admins can update settings" };

  const currentSettings = (space.settings as Record<string, unknown>) || {};
  const merged = { ...currentSettings, ...settings };

  await db
    .update(spaces)
    .set({ settings: merged, updatedAt: new Date() })
    .where(eq(spaces.id, space.id));

  redirect("/settings");
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

  const normalizedEmail = email.toLowerCase().trim();

  // Verify admin
  const [actingMembership] = await db
    .select({ role: spaceMembers.role })
    .from(spaceMembers)
    .where(
      and(eq(spaceMembers.spaceId, space.id), eq(spaceMembers.userId, user.id))
    );

  if (actingMembership?.role !== "admin") return { error: "Only admins can invite members" };

  // Check member limit
  if (!(await canAddMember(space.id))) {
    return { error: "Member limit reached. Upgrade to Canopy for more members." };
  }

  // Check if user already exists
  const [existingUser] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.email, normalizedEmail));

  if (existingUser) {
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

    // Add existing user directly
    await db.insert(spaceMembers).values({
      spaceId: space.id,
      userId: existingUser.id,
      role: "member",
    });

    // Send notification email (best-effort)
    if (isEmailConfigured()) {
      try {
        await sendAddedToSpaceEmail(
          normalizedEmail,
          space.name,
          user.name || user.email || "A space admin",
        );
      } catch {
        // Don't fail the action if email fails
      }
    }

    revalidatePath("/members");
    return { success: true, message: "Member added successfully!" };
  }

  // New user — create invitation
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(invitations).values({
    spaceId: space.id,
    email: normalizedEmail,
    role: "member",
    token,
    invitedBy: user.id!,
    status: "pending",
    expiresAt,
  });

  // Send invite email (best-effort)
  if (isEmailConfigured()) {
    try {
      await sendSpaceInviteEmail(
        normalizedEmail,
        space.name,
        user.name || user.email || "A space admin",
        token,
      );
    } catch {
      // Don't fail the action if email fails
    }
  }

  revalidatePath("/members");
  return { success: true, message: "Invitation sent!" };
}

export async function clearSpaceData() {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  // Verify admin
  const [membership] = await db
    .select({ role: spaceMembers.role })
    .from(spaceMembers)
    .where(
      and(eq(spaceMembers.spaceId, space.id), eq(spaceMembers.userId, user.id))
    );

  if (membership?.role !== "admin") return { error: "Only admins can clear space data" };

  // Delete all content in FK-safe order (preserving space, members, users)
  try {
    await db.delete(schema.insights).where(eq(schema.insights.spaceId, space.id));
    await db.delete(schema.topics).where(eq(schema.topics.spaceId, space.id));
    await db.delete(schema.proposals).where(eq(schema.proposals.spaceId, space.id));
    await db.delete(schema.documents).where(eq(schema.documents.spaceId, space.id));
    await db.delete(schema.actions).where(eq(schema.actions.spaceId, space.id));
    await db.delete(schema.meetings).where(eq(schema.meetings.spaceId, space.id));
    await db.delete(schema.decisions).where(eq(schema.decisions.spaceId, space.id));
    await db.delete(schema.tags).where(eq(schema.tags.spaceId, space.id));
  } catch {
    return { error: "Failed to clear space data. Some data may remain." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
