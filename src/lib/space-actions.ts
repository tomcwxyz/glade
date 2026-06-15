"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { spaces, spaceMembers, users, subscriptions } from "@/db/schema";
import { getCurrentSpace, requireUser, setCurrentSpace, requireSpaceRole } from "@/lib/space";
import { canAddMember } from "@/lib/billing";
import { randomBytes } from "crypto";
import { invitations } from "@/db/schema";
import { sendSpaceInviteEmail, sendAddedToSpaceEmail, isEmailConfigured } from "@/lib/email";

/**
 * Create a new space and add the current user as admin.
 */
export async function createSpace(formData: FormData) {
  const user = await requireUser();
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;

  if (!name || name.trim().length === 0) {
    return { error: "Space name is required" };
  }

  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const existing = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const [space] = await db
    .insert(spaces)
    .values({ name: name.trim(), slug, description })
    .returning({ id: spaces.id, slug: spaces.slug });

  await db.insert(spaceMembers).values({
    spaceId: space.id,
    userId: user.id,
    role: "admin",
  });

  await db.insert(subscriptions).values({
    spaceId: space.id,
    planTier: "free",
    status: "active",
  });

  await setCurrentSpace(space.slug);

  const wantExampleData = formData.get("exampleData") === "on";
  if (wantExampleData) {
    const [dbUser] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    const { seedExampleData } = await import("@/lib/example-data");
    await seedExampleData(space.id, user.id, dbUser?.name || "You");
  }

  redirect("/dashboard");
}

/**
 * Switch to a different space.
 */
export async function switchSpace(slug: string) {
  await setCurrentSpace(slug);
  redirect("/dashboard");
}

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

/** Refresh a pending invitation's expiry and re-send the email (admin only). */
export async function resendInvitation(invitationId: string) {
  const auth = await requireSpaceRole("admin");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  const [invite] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.id, invitationId), eq(invitations.spaceId, space.id)))
    .limit(1);
  if (!invite) return { error: "Invitation not found" };

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db
    .update(invitations)
    .set({ status: "pending", expiresAt })
    .where(eq(invitations.id, invitationId));

  if (isEmailConfigured()) {
    try {
      await sendSpaceInviteEmail(
        invite.email,
        space.name,
        user.name || user.email || "A space admin",
        invite.token,
      );
    } catch {
      // Don't fail the action if email fails
    }
  }

  revalidatePath("/members");
  return { success: true, message: "Invitation re-sent." };
}

/** Delete a pending invitation (admin only). */
export async function revokeInvitation(invitationId: string) {
  const auth = await requireSpaceRole("admin");
  if ("error" in auth) return auth;
  const { space } = auth;

  // Scope the delete to the caller's space.
  await db
    .delete(invitations)
    .where(and(eq(invitations.id, invitationId), eq(invitations.spaceId, space.id)));

  revalidatePath("/members");
  return { success: true };
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

  // Delete all content in FK-safe order (preserving space, members, users).
  // Atomic: a partial failure rolls back fully — no "some data may remain".
  try {
    await db.transaction(async (tx) => {
      await tx.delete(schema.insights).where(eq(schema.insights.spaceId, space.id));
      await tx.delete(schema.topics).where(eq(schema.topics.spaceId, space.id));
      await tx.delete(schema.proposals).where(eq(schema.proposals.spaceId, space.id));
      await tx.delete(schema.documents).where(eq(schema.documents.spaceId, space.id));
      await tx.delete(schema.actions).where(eq(schema.actions.spaceId, space.id));
      await tx.delete(schema.meetings).where(eq(schema.meetings.spaceId, space.id));
      await tx.delete(schema.decisions).where(eq(schema.decisions.spaceId, space.id));
      await tx.delete(schema.tags).where(eq(schema.tags.spaceId, space.id));
    });
  } catch {
    return { error: "Failed to clear space data — rolled back, nothing was deleted." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
