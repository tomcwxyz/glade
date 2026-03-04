# Password Reset Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to reset forgotten passwords via email and change their password from within the app.

**Architecture:** Two flows — (1) forgot-password sends a hashed token via Resend email, user clicks link to set new password; (2) in-app change-password on the Settings page requires current password verification. Both use bcryptjs for password hashing (cost 12), matching the existing auth setup.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, Resend SDK, bcryptjs, crypto (Node built-in)

---

### Task 1: Add `password_reset_tokens` table to schema

**Files:**
- Modify: `src/db/schema.ts:183` (after `verificationTokens` table)

**Step 1: Add the table definition**

After the `verificationTokens` table (line 183), add:

```typescript
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("password_reset_tokens_email_idx").on(t.email)]
);
```

**Step 2: Apply migration to Neon DB**

Write a temp `run-migration.cjs` script:

```javascript
require("dotenv").config({ path: ".env.local" });
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      email TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS password_reset_tokens_email_idx ON password_reset_tokens (email)`;
  console.log("Done: password_reset_tokens table created");
}

main().catch(console.error);
```

Run: `node run-migration.cjs`
Then delete the script.

**Step 3: Verify**

Run: `npm run build`
Expected: Compiles successfully.

**Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add password_reset_tokens table to schema"
```

---

### Task 2: Create email helper (`src/lib/email.ts`)

**Files:**
- Create: `src/lib/email.ts`

**Step 1: Install Resend SDK**

Run: `npm install resend`

**Step 2: Create the email helper**

```typescript
import { Resend } from "resend";

function getResend() {
  const key = process.env.AUTH_RESEND_KEY;
  if (!key) throw new Error("AUTH_RESEND_KEY is not set");
  return new Resend(key);
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resend = getResend();
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  await resend.emails.send({
    from: "Glade <noreply@ourglade.app>",
    to: email,
    subject: "Reset your Glade password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="font-size: 20px; font-weight: 500; margin-bottom: 16px;">Reset your password</h2>
        <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 24px;">
          Someone requested a password reset for your Glade account. Click the button below to choose a new password. This link expires in 1 hour.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #2d6a4f; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
          Reset password
        </a>
        <p style="font-size: 13px; color: #888; margin-top: 24px; line-height: 1.5;">
          If you didn't request this, you can safely ignore this email. Your password won't change.
        </p>
      </div>
    `,
  });
}
```

**Step 3: Verify**

Run: `npm run build`
Expected: Compiles successfully (Resend is only called at runtime).

**Step 4: Commit**

```bash
git add src/lib/email.ts package.json package-lock.json
git commit -m "feat: add Resend email helper for password reset"
```

---

### Task 3: Add server actions for password reset and change

**Files:**
- Modify: `src/lib/auth-actions.ts`

**Step 1: Add the three server actions**

Add to `src/lib/auth-actions.ts` after the existing `signUp` function:

```typescript
import { randomBytes, createHash } from "crypto";
import { passwordResetTokens } from "@/db/schema";
import { sendPasswordResetEmail } from "@/lib/email";
import { auth } from "@/lib/auth";

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
```

**Step 2: Verify**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/lib/auth-actions.ts
git commit -m "feat: add requestPasswordReset, resetPassword, changePassword server actions"
```

---

### Task 4: Update middleware to allow public password reset routes

**Files:**
- Modify: `src/middleware.ts:10`

**Step 1: Add routes to public paths**

Change the `publicPaths` array on line 10:

```typescript
const publicPaths = ["/", "/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/api/auth", "/api/v1", "/new-space", "/shared", "/public", "/embed"];
```

**Step 2: Verify**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add forgot-password and reset-password to public routes"
```

---

### Task 5: Create forgot-password page

**Files:**
- Create: `src/app/(auth)/forgot-password/page.tsx`

**Step 1: Create the page**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { requestPasswordReset } from "@/lib/auth-actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.set("email", email);
    const result = await requestPasswordReset(formData);

    if (result.success) setMessage(result.success);
    if (result.error) setMessage(result.error);
    setLoading(false);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-10">
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Reset your password
        </h1>
        <p className="text-sm text-bark-muted">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {message ? (
        <div className="rounded-lg border border-canopy/20 bg-canopy-pale p-4 mb-6">
          <p className="text-sm text-bark">{message}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-bark mb-1.5">
            Email
          </label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-muted" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@organisation.org"
              required
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Send reset link"}
        </button>
      </form>

      <p className="text-center mt-8">
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-1.5 text-sm text-bark-muted hover:text-bark transition-colors"
        >
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
```

**Step 2: Verify**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/app/\(auth\)/forgot-password/page.tsx
git commit -m "feat: add forgot-password page"
```

---

### Task 6: Create reset-password page

**Files:**
- Create: `src/app/(auth)/reset-password/page.tsx`

**Step 1: Create the page**

```tsx
"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { resetPassword } from "@/lib/auth-actions";
import { FormError } from "@/components/form-error";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="w-full max-w-sm text-center">
        <FormError message="Invalid reset link. Please request a new one." />
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-1.5 text-sm text-canopy hover:text-canopy-light transition-colors font-medium mt-4"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle2 size={40} className="text-canopy" />
        </div>
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Password reset
        </h1>
        <p className="text-sm text-bark-muted mb-6">
          Your password has been updated. You can now sign in.
        </p>
        <Link
          href="/sign-in"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.set("token", token!);
    formData.set("password", password);
    const result = await resetPassword(formData);

    if (result.error) setError(result.error);
    if (result.success) setSuccess(true);
    setLoading(false);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-10">
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Choose a new password
        </h1>
        <p className="text-sm text-bark-muted">
          Must be at least 8 characters
        </p>
      </div>

      <FormError message={error} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-bark mb-1.5">
            New password
          </label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-muted" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-bark mb-1.5">
            Confirm password
          </label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-muted" />
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your new password"
              required
              minLength={8}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Reset password"}
        </button>
      </form>

      <p className="text-center mt-8">
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-1.5 text-sm text-bark-muted hover:text-bark transition-colors"
        >
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
```

**Step 2: Verify**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/app/\(auth\)/reset-password/page.tsx
git commit -m "feat: add reset-password page"
```

---

### Task 7: Add "Forgot password?" link to sign-in page

**Files:**
- Modify: `src/app/(auth)/sign-in/page.tsx:102` (after the password input closing div)

**Step 1: Add the link**

After the password field's closing `</div>` (line 101) and before the submit `<button>` (line 104), add:

```tsx
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-bark-muted hover:text-canopy transition-colors"
          >
            Forgot password?
          </Link>
        </div>
```

**Step 2: Verify**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/app/\(auth\)/sign-in/page.tsx
git commit -m "feat: add forgot-password link to sign-in page"
```

---

### Task 8: Add "Your Account" section to Settings page

**Files:**
- Create: `src/app/(app)/settings/change-password-form.tsx`
- Modify: `src/app/(app)/settings/page.tsx`

**Step 1: Create the change-password client component**

```tsx
"use client";

import { useState } from "react";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
import { changePassword } from "@/lib/auth-actions";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.set("currentPassword", currentPassword);
    formData.set("newPassword", newPassword);
    const result = await changePassword(formData);

    if (result.error) setError(result.error);
    if (result.success) {
      setSuccess(result.success);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-earth/20 bg-earth/5 px-4 py-3">
          <p className="text-sm text-earth">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-canopy/20 bg-canopy-pale px-4 py-3 flex items-center gap-2">
          <CheckCircle2 size={15} className="text-canopy shrink-0" />
          <p className="text-sm text-bark">{success}</p>
        </div>
      )}

      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-bark mb-1.5">
          Current password
        </label>
        <div className="relative">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-muted" />
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
          />
        </div>
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-bark mb-1.5">
          New password
        </label>
        <div className="relative">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-muted" />
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
          />
        </div>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-bark mb-1.5">
          Confirm new password
        </label>
        <div className="relative">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-muted" />
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            required
            minLength={8}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-60"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : "Change password"}
      </button>
    </form>
  );
}
```

**Step 2: Add "Your Account" section to settings page**

In `src/app/(app)/settings/page.tsx`:

- Add import for `ChangePasswordForm`
- Add a `getUserPasswordStatus` query (or inline query)
- Render the account section before the space settings

Add before the `<header>` in the return (or after it, as a new section before `<SpaceSettingsForm>`):

After the `</header>` and before `<SpaceSettingsForm>`, add:

```tsx
{hasPassword && (
  <section className="mb-12 pb-10 border-b border-border">
    <h2
      className="text-xl font-light tracking-tight mb-1"
      style={{ fontFamily: "var(--font-display)" }}
    >
      Your Account
    </h2>
    <p className="text-sm text-bark-muted mb-6">
      {user.email}
    </p>
    <ChangePasswordForm />
  </section>
)}
```

The `hasPassword` boolean comes from a DB query:

```typescript
const [userRecord] = await db
  .select({ passwordHash: users.passwordHash })
  .from(users)
  .where(eq(users.id, user.id))
  .limit(1);
const hasPassword = !!userRecord?.passwordHash;
```

Add necessary imports: `import { eq } from "drizzle-orm"`, `import { users } from "@/db/schema"`, `import { ChangePasswordForm } from "./change-password-form"`.

**Step 3: Verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/app/\(app\)/settings/change-password-form.tsx src/app/\(app\)/settings/page.tsx
git commit -m "feat: add change-password form to settings page"
```

---

### Task 9: Final verification

**Step 1: Lint**

Run: `npm run lint`
Fix any issues.

**Step 2: Build**

Run: `npm run build`
Confirm clean build.

**Step 3: Commit any lint fixes**

```bash
git add -A
git commit -m "fix: lint fixes for password reset feature"
```
