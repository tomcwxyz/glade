# Member Invites, Magic Links & Email Styling

> Date: 2026-03-04

## Problem

1. **No invite flow** — admins can only add users who already have a Glade account. No way to invite new users.
2. **Unstyled verify-request page** — after sending a magic link, NextAuth shows a dark, default-styled page that doesn't match Glade.
3. **Unstyled emails** — magic link and password reset emails are plain/default. No Glade branding.

## Design

### 1. Invite System

**New DB table: `invitations`**
- `id`, `spaceId`, `email`, `role` (default "member"), `token` (unique), `invitedBy` (userId), `status` (pending/accepted/expired), `expiresAt`, `createdAt`

**Flow when admin clicks "Add member":**
1. Check if a user with that email already exists in `users`
2. **If yes** → add to `spaceMembers` directly + send "You were added" notification email
3. **If no** → create `invitations` row with secure token, send invite email with:
   - Primary CTA: magic link (one-click join via NextAuth Resend)
   - Secondary link: `/sign-up?invite={token}` (password-based sign-up)
4. When invited person signs up or signs in via magic link, check for pending invitations matching their email → auto-add to space(s)

**Invite token handling:**
- Token checked on sign-up page: if `?invite=` param present, after account creation, consume invitation and add to space
- Token also checked in NextAuth `signIn` callback: after magic link auth, check for pending invitations for that email
- Tokens expire after 7 days; admin can re-send

### 2. Verify Request Page

**New page: `src/app/(auth)/verify-request/page.tsx`**
- Matches existing sign-in/sign-up layout (centred card, warm paper background)
- "Check your email" heading in Fraunces display font
- Subtext: "We sent a sign-in link to {email}" (email via query param)
- "Back to sign in" link
- Added to public routes in middleware

**NextAuth config:** `pages: { verifyRequest: "/verify-request" }`

### 3. Branded Email Templates

**New helper: `src/lib/email-templates.ts`**

`gladeEmail()` function wrapping any email content in a branded shell:
- Paper background (#faf8f5), white content card
- Glade wordmark at top (text-based, not image)
- Forest green CTA button (canopy colour)
- Body text in system sans-serif
- Supports: heading, body, CTA, optional secondary CTA, footer

**Applied to:**
1. **Invite email** (new) — "You've been invited to [Space]" + magic link CTA + sign-up fallback
2. **Added-to-space email** (new) — "You were added to [Space]" + dashboard link
3. **Password reset email** (existing) — migrate to shared template
4. **Magic link sign-in email** — override NextAuth default via `sendVerificationRequest`

### 4. Sign-up with Invite Token

**Changes to sign-up page:** read `?invite=` query param, pass to `signUp` action.

**Changes to `signUp` action:** accept optional `inviteToken`, after creating user consume invitation and add to space.

**Changes to NextAuth `signIn` callback:** after magic link auth, check for pending invitations for that email → auto-add to spaces.

Both paths (magic link and password sign-up) correctly consume invitations.

## Files to Create/Modify

### New files
- `src/lib/email-templates.ts` — branded email template helper
- `src/app/(auth)/verify-request/page.tsx` — styled verify-request page

### Modified files
- `src/db/schema.ts` — add `invitations` table
- `src/lib/email.ts` — add invite/notification email functions, migrate password reset to shared template
- `src/lib/space-actions.ts` — rewrite `inviteMember` to handle existing/new users
- `src/lib/auth-actions.ts` — accept invite token in `signUp`, add invitation consumption
- `src/lib/auth.ts` — add `sendVerificationRequest` override, check invitations in `signIn` callback
- `src/lib/auth.config.ts` — add `verifyRequest` page config
- `src/app/(auth)/sign-up/page.tsx` — read invite query param
- `src/app/(app)/members/members-list.tsx` — update UI for invite flow
- `src/middleware.ts` — add `/verify-request` to public routes
- `src/lib/queries.ts` — add invitation queries
