# Member Invites, Magic Links & Email Styling — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow admins to invite new users (not just existing ones) to a space, style the magic link verify page, and brand all outgoing emails with Glade's design.

**Architecture:** New `invitations` table stores pending invites with secure tokens. A shared email template helper wraps all outgoing emails in Glade branding. The sign-up page and NextAuth signIn callback both consume pending invitations. A custom verify-request page replaces NextAuth's default.

**Tech Stack:** Next.js 15, Drizzle ORM, Resend (email), NextAuth v5, Tailwind CSS

---

### Task 1: Branded Email Template Helper

**Files:**
- Create: `src/lib/email-templates.ts`

**Step 1: Create the email template helper**

Create `src/lib/email-templates.ts` with a `gladeEmail()` function that returns a complete HTML email string:

```typescript
interface GladeEmailOptions {
  preview: string;
  heading: string;
  body: string;
  cta: { label: string; url: string };
  secondaryCta?: { label: string; url: string };
  footer?: string;
}

export function gladeEmail({ preview, heading, body, cta, secondaryCta, footer }: GladeEmailOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f5f0eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <!-- Preview text -->
  <div style="display:none;max-height:0;overflow:hidden;">${preview}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0eb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#3d3428;letter-spacing:-0.02em;">&#127807; Glade</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:12px;padding:40px 36px;">
              <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;font-weight:500;color:#3d3428;line-height:1.3;">${heading}</h1>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#6b5e50;">${body}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 0 0;">
                <tr>
                  <td style="border-radius:8px;background-color:#2d6a4f;">
                    <a href="${cta.url}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${cta.label}</a>
                  </td>
                </tr>
              </table>
              ${secondaryCta ? `
              <p style="margin:20px 0 0;font-size:13px;color:#6b5e50;">
                Or <a href="${secondaryCta.url}" style="color:#2d6a4f;text-decoration:underline;">${secondaryCta.label}</a>
              </p>` : ""}
              ${footer ? `<p style="margin:28px 0 0;font-size:13px;color:#9b8e80;line-height:1.5;">${footer}</p>` : ""}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9b8e80;">Sent by Glade &middot; ourglade.app</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function getBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/lib/email-templates.ts` or just `npm run build`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/lib/email-templates.ts
git commit -m "feat: add branded email template helper"
```

---

### Task 2: Migrate Password Reset Email to Branded Template

**Files:**
- Modify: `src/lib/email.ts`

**Step 1: Rewrite email.ts to use the branded template**

Replace the entire content of `src/lib/email.ts`:

```typescript
import { Resend } from "resend";
import { gladeEmail, getBaseUrl } from "@/lib/email-templates";

function getResend() {
  const key = process.env.AUTH_RESEND_KEY;
  if (!key) throw new Error("AUTH_RESEND_KEY is not set");
  return new Resend(key);
}

export function isEmailConfigured(): boolean {
  return !!process.env.AUTH_RESEND_KEY;
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resend = getResend();
  const resetUrl = `${getBaseUrl()}/reset-password?token=${token}`;

  await resend.emails.send({
    from: "Glade <noreply@ourglade.app>",
    to: email,
    subject: "Reset your Glade password",
    html: gladeEmail({
      preview: "Reset your Glade password",
      heading: "Reset your password",
      body: "Someone requested a password reset for your Glade account. Click the button below to choose a new password.",
      cta: { label: "Reset password", url: resetUrl },
      footer: "This link expires in 1 hour. If you didn't request this, you can safely ignore this email.",
    }),
  });
}

export async function sendSpaceInviteEmail(
  email: string,
  spaceName: string,
  inviterName: string,
  inviteToken: string,
  magicLinkUrl?: string,
) {
  const resend = getResend();
  const signUpUrl = `${getBaseUrl()}/sign-up?invite=${inviteToken}`;

  await resend.emails.send({
    from: "Glade <noreply@ourglade.app>",
    to: email,
    subject: `${inviterName} invited you to ${spaceName} on Glade`,
    html: gladeEmail({
      preview: `${inviterName} invited you to ${spaceName}`,
      heading: `You're invited to ${spaceName}`,
      body: `${inviterName} has invited you to join <strong>${spaceName}</strong> on Glade, a governance platform for social purpose organisations.`,
      cta: magicLinkUrl
        ? { label: `Join ${spaceName}`, url: magicLinkUrl }
        : { label: "Create your account", url: signUpUrl },
      secondaryCta: magicLinkUrl
        ? { label: "create an account with a password instead", url: signUpUrl }
        : undefined,
      footer: "This invitation expires in 7 days.",
    }),
  });
}

export async function sendAddedToSpaceEmail(
  email: string,
  spaceName: string,
  inviterName: string,
) {
  const resend = getResend();
  const dashboardUrl = `${getBaseUrl()}/dashboard`;

  await resend.emails.send({
    from: "Glade <noreply@ourglade.app>",
    to: email,
    subject: `You were added to ${spaceName} on Glade`,
    html: gladeEmail({
      preview: `You were added to ${spaceName}`,
      heading: `You've been added to ${spaceName}`,
      body: `${inviterName} has added you to <strong>${spaceName}</strong> on Glade. You can now access this space from your dashboard.`,
      cta: { label: "Go to dashboard", url: dashboardUrl },
    }),
  });
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Builds successfully (email.ts is only imported in auth-actions.ts and space-actions.ts)

**Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: brand all emails with Glade template, add invite & notification emails"
```

---

### Task 3: Add `invitations` Table to Schema

**Files:**
- Modify: `src/db/schema.ts` (add after `passwordResetTokens` table, around line 195)

**Step 1: Add the invitation status enum and invitations table**

Add after the `subscriptionStatusEnum` (line 128), before the `// NextAuth tables` comment:

```typescript
export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired",
]);
```

Add after the `passwordResetTokens` table (after line 195):

```typescript
export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: spaceRoleEnum("role").default("member").notNull(),
    token: varchar("token", { length: 64 }).unique().notNull(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id),
    status: invitationStatusEnum("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (i) => [
    index("invitations_email_idx").on(i.email),
    index("invitations_token_idx").on(i.token),
    index("invitations_space_idx").on(i.spaceId),
  ]
);
```

**Step 2: Run the migration against Neon**

Write a temp `run-migration.cjs` script following the project's established pattern (see CLAUDE.md "DB Migration Pattern"):

```javascript
const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function run() {
  await sql`CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired')`;
  await sql`CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role space_role NOT NULL DEFAULT 'member',
    token VARCHAR(64) UNIQUE NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id),
    status invitation_status NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE INDEX invitations_email_idx ON invitations(email)`;
  await sql`CREATE INDEX invitations_token_idx ON invitations(token)`;
  await sql`CREATE INDEX invitations_space_idx ON invitations(space_id)`;
  console.log("Done: invitations table created");
}

run().catch(console.error);
```

Run: `node run-migration.cjs`
Expected: "Done: invitations table created"

Delete the migration script after running.

**Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add invitations table to schema"
```

---

### Task 4: Add Invitation Queries

**Files:**
- Modify: `src/lib/queries.ts` (add at end of file)

**Step 1: Add invitation query functions**

Add these imports at the top of queries.ts (alongside existing imports from schema):

```typescript
import { invitations } from "@/db/schema";
```

Add these functions at the end of the file:

```typescript
export async function getInvitationByToken(token: string) {
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);
  return invitation ?? null;
}

export async function getPendingInvitationsForEmail(email: string) {
  return db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.email, email.toLowerCase().trim()),
        eq(invitations.status, "pending")
      )
    );
}

export async function getPendingInvitationsForSpace(spaceId: string) {
  return db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.spaceId, spaceId),
        eq(invitations.status, "pending")
      )
    );
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Builds successfully

**Step 3: Commit**

```bash
git add src/lib/queries.ts
git commit -m "feat: add invitation query functions"
```

---

### Task 5: Rewrite `inviteMember` to Handle New Users

**Files:**
- Modify: `src/lib/space-actions.ts` (rewrite the `inviteMember` function, lines 154–205)

**Step 1: Add imports**

Add to the imports at the top of `space-actions.ts`:

```typescript
import { randomBytes } from "crypto";
import { invitations } from "@/db/schema";
import { sendSpaceInviteEmail, sendAddedToSpaceEmail, isEmailConfigured } from "@/lib/email";
```

**Step 2: Rewrite inviteMember**

Replace the `inviteMember` function (lines 154–205) with:

```typescript
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
```

**Step 3: Add `revalidatePath` import if not present**

It's already imported at the top of the file.

**Step 4: Verify build**

Run: `npm run build`
Expected: Builds successfully

**Step 5: Commit**

```bash
git add src/lib/space-actions.ts
git commit -m "feat: inviteMember handles new users with invite tokens and emails"
```

---

### Task 6: Update Members List UI

**Files:**
- Modify: `src/app/(app)/members/members-list.tsx` (update success message, line 73 and help text, line 143–144)

**Step 1: Update the invite handler to use the message from the server**

In `handleInvite`, change line 73 from:

```typescript
setInviteMessage({ type: "success", text: "Member added successfully!" });
```

to:

```typescript
setInviteMessage({ type: "success", text: result?.message || "Done!" });
```

**Step 2: Update help text**

Change the help text (line 143–144) from:

```
The person must already have a Glade account. They&apos;ll be added as a member.
```

to:

```
If they already have a Glade account, they&apos;ll be added immediately. Otherwise, they&apos;ll receive an invitation email.
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Builds successfully

**Step 4: Commit**

```bash
git add src/app/(app)/members/members-list.tsx
git commit -m "feat: update member invite UI to reflect new invite flow"
```

---

### Task 7: Consume Invitations on Sign-Up

**Files:**
- Modify: `src/lib/auth-actions.ts` (update `signUp` function)
- Modify: `src/app/(auth)/sign-up/page.tsx` (read invite param)

**Step 1: Update signUp to accept and consume invite tokens**

In `src/lib/auth-actions.ts`, add imports:

```typescript
import { invitations, spaceMembers } from "@/db/schema";
```

Modify the `signUp` function to accept an optional invite token. After the user is created and before `signIn`, add invitation consumption:

```typescript
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
```

**Step 2: Update sign-up page to pass invite token**

In `src/app/(auth)/sign-up/page.tsx`, add `useSearchParams` and pass the token as a hidden field:

```typescript
"use client";

import { Suspense, useState } from "react";
import { signUp } from "@/lib/auth-actions";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock, Mail, User, Loader2 } from "lucide-react";
import { FormError } from "@/components/form-error";

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signUp(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // Success redirects via signIn in the server action
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-10">
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Create your account
        </h1>
        <p className="text-sm text-bark-muted">
          {inviteToken
            ? "Create an account to join the space you were invited to"
            : "Start building your organisation\u2019s governance memory"}
        </p>
      </div>

      <FormError message={error} />

      <form onSubmit={handleSubmit} className="space-y-4">
        {inviteToken && (
          <input type="hidden" name="inviteToken" value={inviteToken} />
        )}
        {/* ...rest of form unchanged... */}
```

Only the wrapper, subtext, and hidden input change. The rest of the form stays the same.

**Step 3: Verify build**

Run: `npm run build`
Expected: Builds successfully

**Step 4: Commit**

```bash
git add src/lib/auth-actions.ts src/app/(auth)/sign-up/page.tsx
git commit -m "feat: consume invitation tokens on sign-up"
```

---

### Task 8: Consume Invitations on Magic Link Sign-In

**Files:**
- Modify: `src/lib/auth.ts` (add signIn event handler)

**Step 1: Add invitation consumption in auth.ts events**

In `src/lib/auth.ts`, add an `events` block to the NextAuth config. Add it after the spread of `authConfig`:

```typescript
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  events: {
    async signIn({ user }) {
      // Consume any pending invitations for this user's email
      if (!user.email) return;
      const pending = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.email, user.email.toLowerCase().trim()),
            eq(invitations.status, "pending"),
          )
        );

      for (const inv of pending) {
        if (inv.expiresAt < new Date()) continue;

        // Check not already a member
        const [existing] = await db
          .select({ id: spaceMembers.id })
          .from(spaceMembers)
          .where(
            and(
              eq(spaceMembers.spaceId, inv.spaceId),
              eq(spaceMembers.userId, user.id!),
            )
          );

        if (!existing) {
          await db.insert(spaceMembers).values({
            spaceId: inv.spaceId,
            userId: user.id!,
            role: inv.role,
          });
        }

        await db
          .update(invitations)
          .set({ status: "accepted" })
          .where(eq(invitations.id, inv.id));
      }
    },
  },
  providers: [
    // ...existing providers unchanged
  ],
});
```

Add the necessary imports at the top:

```typescript
import { and } from "drizzle-orm";
import { invitations, spaceMembers } from "@/db/schema";
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Builds successfully

**Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: consume pending invitations on any sign-in"
```

---

### Task 9: Custom Verify-Request Page

**Files:**
- Create: `src/app/(auth)/verify-request/page.tsx`
- Modify: `src/lib/auth.config.ts` (add verifyRequest page)
- Modify: `src/middleware.ts` (add /verify-request to public routes)

**Step 1: Create the verify-request page**

```typescript
import { Suspense } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";

export const metadata = { title: "Check your email" };

function VerifyRequestContent({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  // Note: in Next.js 15 App Router, searchParams is a promise in page components
  // But we'll use a client component to read them instead
  return null;
}

export default function VerifyRequestPage() {
  return (
    <Suspense>
      <VerifyRequestInner />
    </Suspense>
  );
}

// Use client component to read search params
import { VerifyRequestInner } from "./verify-request-inner";
```

Actually, simpler approach — make it a client component like the other auth pages:

Create `src/app/(auth)/verify-request/page.tsx`:

```typescript
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail } from "lucide-react";

export default function VerifyRequestPage() {
  return (
    <Suspense>
      <VerifyRequestContent />
    </Suspense>
  );
}

function VerifyRequestContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="w-full max-w-sm text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-canopy-pale flex items-center justify-center mb-6">
        <Mail size={24} className="text-canopy" />
      </div>

      <h1
        className="text-2xl font-medium tracking-tight mb-3"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Check your email
      </h1>

      <p className="text-sm text-bark-muted leading-relaxed mb-8">
        {email ? (
          <>We sent a sign-in link to <strong className="text-bark font-medium">{email}</strong>.</>
        ) : (
          <>We sent you a sign-in link.</>
        )}{" "}
        Click the link in the email to continue.
      </p>

      <Link
        href="/sign-in"
        className="text-sm text-canopy hover:text-canopy-light transition-colors font-medium"
      >
        Back to sign in
      </Link>
    </div>
  );
}
```

**Step 2: Add verifyRequest to auth.config.ts pages**

In `src/lib/auth.config.ts`, update the `pages` object (line 12):

```typescript
pages: {
  signIn: "/sign-in",
  newUser: "/dashboard",
  verifyRequest: "/verify-request",
},
```

**Step 3: Add /verify-request to middleware public routes**

In `src/middleware.ts`, add `"/verify-request"` to the `publicPaths` array (line 10):

```typescript
const publicPaths = ["/", "/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/verify-request", "/api/auth", "/api/v1", "/new-space", "/shared", "/public", "/embed"];
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Builds successfully

**Step 5: Commit**

```bash
git add src/app/(auth)/verify-request/page.tsx src/lib/auth.config.ts src/middleware.ts
git commit -m "feat: add Glade-styled verify-request page for magic links"
```

---

### Task 10: Override NextAuth Magic Link Email Template

**Files:**
- Modify: `src/lib/auth.ts` (add sendVerificationRequest to Resend provider)

**Step 1: Override the default magic link email**

In `src/lib/auth.ts`, update the Resend provider to include a custom `sendVerificationRequest`:

```typescript
import { gladeEmail } from "@/lib/email-templates";
import { Resend as ResendClient } from "resend";

// Then in the Resend provider config:
Resend({
  from: "Glade <noreply@ourglade.app>",
  async sendVerificationRequest({ identifier: email, url }) {
    const resend = new ResendClient(process.env.AUTH_RESEND_KEY!);
    await resend.emails.send({
      from: "Glade <noreply@ourglade.app>",
      to: email,
      subject: "Sign in to Glade",
      html: gladeEmail({
        preview: "Your sign-in link for Glade",
        heading: "Sign in to Glade",
        body: "Click the button below to sign in to your Glade account. This link expires in 24 hours.",
        cta: { label: "Sign in to Glade", url },
        footer: "If you didn't request this email, you can safely ignore it.",
      }),
    });
  },
}),
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Builds successfully

**Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: brand magic link emails with Glade template"
```

---

### Task 11: Final Verification

**Step 1: Run lint**

Run: `npm run lint`
Expected: No new errors (pre-existing warning in walkthrough.tsx is OK)

**Step 2: Run build**

Run: `npm run build`
Expected: Builds successfully with no errors

**Step 3: Manual testing checklist**

With the dev server running (`npm run dev`):

1. **Existing user invite**: Go to Members → Add member → enter an existing user's email → should say "Member added successfully!" and the member appears in the list
2. **New user invite**: Enter a non-existent email → should say "Invitation sent!"
3. **Sign-up with invite**: Visit `/sign-up?invite=<token>` → sign up → should auto-join the space
4. **Magic link verify page**: On sign-in, enter email and click magic link button → should redirect to `/verify-request` with Glade branding (not dark NextAuth default)
5. **Email styling**: Check Resend dashboard (or logs) for branded HTML emails

**Step 4: Commit any fixes if needed, then final commit**

```bash
git add -A
git commit -m "chore: final verification pass for member invites and email branding"
```
