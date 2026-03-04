"use server";

import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { users, passwordResetTokens, invitations, spaceMembers } from "@/db/schema";
import { signIn, auth } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";

export async function signUp(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const inviteToken = formData.get("inviteToken") as string | null;

  if (!email || !password || !name) {
    return { error: "All fields are required" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  // Check if user already exists
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [newUser] = await db.insert(users).values({
    name,
    email,
    passwordHash,
  }).returning({ id: users.id });

  // Consume invite token if provided
  if (inviteToken) {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.token, inviteToken),
          eq(invitations.status, "pending"),
        )
      )
      .limit(1);

    if (invitation && invitation.expiresAt > new Date()) {
      await db.insert(spaceMembers).values({
        spaceId: invitation.spaceId,
        userId: newUser.id,
        role: invitation.role,
      });
      await db
        .update(invitations)
        .set({ status: "accepted" })
        .where(eq(invitations.id, invitation.id));
    }
  }

  // Also consume any other pending invitations for this email
  const pendingInvites = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.email, email.toLowerCase().trim()),
        eq(invitations.status, "pending"),
      )
    );

  for (const inv of pendingInvites) {
    if (inv.expiresAt > new Date() && inv.token !== inviteToken) {
      await db.insert(spaceMembers).values({
        spaceId: inv.spaceId,
        userId: newUser.id,
        role: inv.role,
      });
      await db
        .update(invitations)
        .set({ status: "accepted" })
        .where(eq(invitations.id, inv.id));
    }
  }

  // Sign in immediately after registration
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/dashboard",
  });
}

export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  if (!email) return { error: "Email is required" };

  // Always show success (prevents email enumeration)
  const successMessage = "If an account with that email exists, we've sent a password reset link.";

  try {
    // Check if user exists and has a password
    const [user] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user?.passwordHash) return { success: successMessage };

    // Delete existing tokens for this email
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.email, email));

    // Generate token
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResetTokens).values({ email, tokenHash, expiresAt });

    // Send email (fails silently if Resend not configured)
    await sendPasswordResetEmail(email, rawToken);
  } catch {
    // Don't leak errors — always show the same message
  }

  return { success: successMessage };
}

export async function resetPassword(formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;

  if (!token || !password) return { error: "Missing required fields" };
  if (password.length < 8) return { error: "Password must be at least 8 characters" };

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const [resetToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!resetToken || resetToken.expiresAt < new Date()) {
    // Clean up expired token if it exists
    if (resetToken) {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, resetToken.id));
    }
    return { error: "This reset link is invalid or has expired. Please request a new one." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.email, resetToken.email));

  // Delete the used token
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, resetToken.id));

  return { success: "Your password has been reset. You can now sign in." };
}

export async function changePassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!currentPassword || !newPassword) return { error: "All fields are required" };
  if (newPassword.length < 8) return { error: "New password must be at least 8 characters" };

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user?.passwordHash) return { error: "No password set for this account" };

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return { error: "Current password is incorrect" };

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  return { success: "Password changed successfully." };
}
