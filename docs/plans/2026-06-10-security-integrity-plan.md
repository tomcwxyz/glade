# Tranche 1 — Security & Integrity — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Run `npm run build` after each task; commit per task.

**Source:** [`2026-06-10-full-app-review.md`](./2026-06-10-full-app-review.md) §1 (Critical). **Index:** [`2026-06-10-review-roadmap.md`](./2026-06-10-review-roadmap.md).
**Branch:** `security-integrity-hardening` (already created off `main`).
**Goal:** close the cross-tenant data holes, the unauthenticated state-reset action, the missing role/facilitator checks, the duplicate-decision-number race, and the broken API-key permission value — all small diffs, high risk. Plus pull in export-injection hardening (S7).

**Covers:** S1, S2, S3, S4, S5, S6, S7, S8, D2, B3.

**Tech:** Next.js 15 App Router, Drizzle ORM, Neon PostgreSQL. No new product surface — defensive changes only.

---

## Architecture decisions

1. **One authorization helper, used everywhere.** Today every action re-implements an ad-hoc `getCurrentSpace()` + manual admin lookup (see `webhook-actions.ts:11`, `api-key-actions.ts:13`). We add a single `requireSpaceRole(minRole)` to `src/lib/space.ts` returning a discriminated union `{ user, space, role } | { error }`. Roles rank `observer(0) < member(1) < admin(2)`. Mutating content actions require `"member"`; admin-only actions require `"admin"`.

2. **IDOR fix pattern: verify ownership by joining to the parent's `spaceId`.** The unscoped delete-by-ID actions never check the row belongs to the caller's space. Fix each by selecting the row joined to its parent entity, filtered on the current space id, and bailing if not found — the same pattern already used correctly in `deleteApiKey` (`api-key-actions.ts:79`).

3. **Live-meeting facilitator authority comes from `meetings.facilitatorId`,** not from the mutable jsonb session state (which any client can try to overwrite). Facilitator-only live actions compare `user.id === meeting.facilitatorId`.

4. **Defence in depth for the state API route.** `/api/meetings/[id]/state` is reachable independently of the server actions. Scope GET and PUT to space membership at the route. (Wiring writes through the optimistic lock is Tranche 2 / B4 — out of scope here.)

5. **D2 now, D1 later.** Add the unique index `decisions(space_id, number)` plus a conflict-retry on insert so concurrent creates can't mint duplicates. The deeper fix (transactions via `neon-serverless`) is Tranche 4a.

---

## Decisions needed before implementation

These two need a human call — surface them and pause if unanswered:

- **Rate limiting (Task 11 / part of S6):** adds a dependency and an external service. Options:
  - **A. Upstash Redis** + `@upstash/ratelimit` `@upstash/redis` (2 new deps, free tier, ~30 min setup). Best fit for serverless; works at the route layer.
  - **B. Vercel WAF / Firewall rules** — no code, no deps, configured in the Vercel dashboard; only available once deployed.
  - **C. Defer** rate limiting to the post-deploy hardening pass; ship the rest of Tranche 1 now.
  - Recommendation: **C for now** (app isn't deployed yet, so there's no live endpoint to abuse), revisit as **A** at deploy. Implement Task 11 only if the user picks A.
- **S4 scope:** confirm observers should be fully read-only (no create/edit/delete of any content, no checkout). Assumed **yes** below.

---

## Task 1 — `requireSpaceRole` authorization helper

**Files:** Modify `src/lib/space.ts`.

**Step 1.** Add role ranking + helpers after `getCurrentSpace` (around line 88). Import `spaceMembers` is already present.

```typescript
export type SpaceRole = "observer" | "member" | "admin";
const ROLE_RANK: Record<SpaceRole, number> = { observer: 0, member: 1, admin: 2 };

type Membership = {
  user: { id: string; name?: string | null; email?: string | null };
  space: { id: string; name: string; slug: string; description: string | null; settings: unknown };
  role: SpaceRole;
};

/**
 * Resolve the current user's membership of the current space, or null if they
 * have no space selected or aren't a member of it.
 */
export async function getCurrentMembership(): Promise<Membership | null> {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return null;

  const [m] = await db
    .select({ role: spaceMembers.role })
    .from(spaceMembers)
    .where(and(eq(spaceMembers.spaceId, space.id), eq(spaceMembers.userId, user.id)))
    .limit(1);

  if (!m) return null;
  return { user, space, role: m.role as SpaceRole };
}

/**
 * Require that the current user has at least `minRole` in the current space.
 * Returns the membership on success, or `{ error }` for the caller to return.
 * Usage:
 *   const auth = await requireSpaceRole("member");
 *   if ("error" in auth) return auth;
 *   const { user, space } = auth;
 */
export async function requireSpaceRole(
  minRole: SpaceRole
): Promise<Membership | { error: string }> {
  const membership = await getCurrentMembership();
  if (!membership) return { error: "No space selected, or you are not a member of it" };
  if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
    return { error: "You don't have permission to do this" };
  }
  return membership;
}
```

**Step 2.** `npm run build` — expect success (new exports, nothing consumes them yet).

**Step 3.** Commit: `feat(security): add requireSpaceRole authorization helper`

---

## Task 2 — Space-scope the unscoped delete/link actions (S2)

Each action below currently deletes/inserts by id with no space check. Add `requireSpaceRole("member")` and verify the target row(s) belong to the current space by joining to the parent entity. Return `{ error }` on failure (callers already handle the `{ error }` shape).

**Files:** `src/lib/decision-actions.ts`, `src/lib/document-actions.ts`, `src/lib/proposal-actions.ts`, `src/lib/ai-actions.ts`.

**2a. `decision-actions.ts`**

- `removeDecisionLink(linkId)` (`:254`): join `decisionLinks` → `decisions` (on `fromDecisionId`), filter `decisions.spaceId = space.id`; if no row, `return { error: "Link not found" }`; else delete.
- `linkDecisionToMeeting(decisionId, meetingId)` (`:258`): after `requireSpaceRole`, verify **both** the decision and the meeting have `spaceId = space.id` before inserting.
- `unlinkDecisionFromMeeting(decisionId, meetingId)` (`:281`): verify the decision (or meeting) belongs to `space.id` before deleting.

Example for `removeDecisionLink`:

```typescript
export async function removeDecisionLink(linkId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  const [link] = await db
    .select({ id: decisionLinks.id })
    .from(decisionLinks)
    .innerJoin(decisions, eq(decisions.id, decisionLinks.fromDecisionId))
    .where(and(eq(decisionLinks.id, linkId), eq(decisions.spaceId, space.id)))
    .limit(1);

  if (!link) return { error: "Link not found" };
  await db.delete(decisionLinks).where(eq(decisionLinks.id, linkId));
}
```

**2b. `document-actions.ts`**

- `addSectionLink(documentId, sectionId, decisionId)` (`:160`): verify `documents.spaceId = space.id` AND `decisions.spaceId = space.id` before insert.
- `removeSectionLink(linkId)` (`:173`): join `documentSectionLinks` → `documents`, filter on `space.id`; bail if not found; keep the existing `revalidatePath`.

**2c. `proposal-actions.ts`**

- `removeProposalReference(referenceId)` (`:228`): join `proposalReferences` → `proposals`, filter on `space.id`; bail if not found.

**2d. `ai-actions.ts`**

- `dismissInsight(insightId)` (`:37`): `insights` has a `spaceId` column — gate on `requireSpaceRole("member")` and filter the update with `and(eq(insights.id, insightId), eq(insights.spaceId, space.id))`.

**Verify:** `npm run build`. Manually confirm a member of space A cannot remove a link/reference/insight belonging to space B (returns "not found").

**Commit:** `fix(security): space-scope unscoped delete/link server actions (S2)`

---

## Task 3 — Space-scope the live-meeting state API route (S1)

**Files:** Modify `src/lib/queries.ts` (add a membership-aware fetch), `src/app/api/meetings/[id]/state/route.ts`.

**Step 1.** In `queries.ts`, replace the unscoped `getMeetingSessionState` usage at the route with a membership-checked variant. Add:

```typescript
export async function getMeetingSessionStateForUser(meetingId: string, userId: string) {
  const [m] = await db
    .select({ sessionState: meetings.sessionState, status: meetings.status })
    .from(meetings)
    .innerJoin(spaceMembers, eq(spaceMembers.spaceId, meetings.spaceId))
    .where(and(eq(meetings.id, meetingId), eq(spaceMembers.userId, userId)))
    .limit(1);
  return m || null;
}
```

Add a similar `updateMeetingSessionStateForUser(meetingId, userId, state, expectedVersion)` that first confirms membership (sub-select on `meetings.spaceId` ∈ the user's memberships) before the optimistic-locked update — or, simpler, verify membership with `getMeetingSessionStateForUser` then call the existing `updateMeetingSessionState`.

**Step 2.** In `route.ts`:
- GET: after the existing `auth()` check, call `getMeetingSessionStateForUser(id, session.user.id)`; a `null` result returns **404** (don't leak existence — same response as a missing meeting).
- PUT: confirm membership the same way before calling the update; non-member → 404.

**Verify:** `npm run build`. Signed-in user from space A gets 404 on space B's meeting state (both GET and PUT). Legit facilitator/member still polls fine.

**Commit:** `fix(security): require space membership on live-meeting state route (S1)`

---

## Task 4 — Authenticate `initializeMeetingState` (S3)

**Files:** Modify `src/lib/meeting-actions.ts` (`:292`), and its single call site (the live page — find with `grep -rn initializeMeetingState src/app`).

**Problem:** current signature `initializeMeetingState(meetingId, spaceId, userId, userName)` trusts all four args and runs no auth — anyone can reset any meeting to `in_progress`.

**Step 1.** Change the signature to `initializeMeetingState(meetingId: string)` and derive identity/space server-side. It must stay render-safe (no `revalidatePath`), so use `requireUser()` + a direct membership check (not `requireSpaceRole`, which is fine to call during render since it only reads):

```typescript
export async function initializeMeetingState(meetingId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return { error: auth.error };
  const { user, space } = auth;

  // The meeting must belong to the caller's current space.
  const [meeting] = await db
    .select({ id: meetings.id, facilitatorId: meetings.facilitatorId })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)))
    .limit(1);
  if (!meeting) return { error: "Meeting not found" };

  if (!(await canUseLiveMeetings(space.id))) {
    return { error: "Live meetings require a Canopy plan." };
  }

  const facilitatorName = user.name || user.email || "Facilitator";
  const initialState = createInitialState(meeting.facilitatorId ?? user.id, facilitatorName);

  await db
    .update(meetings)
    .set({ status: "in_progress", sessionState: initialState, updatedAt: new Date() })
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)));

  return { success: true };
}
```

**Step 2.** Update the call site to pass only `meetingId` (drop the spaceId/userId/userName args).

**Verify:** `npm run build`. Live page still initialises state for a real member; a forged call with someone else's meetingId/spaceId now returns "Meeting not found".

**Commit:** `fix(security): authenticate initializeMeetingState, derive identity server-side (S3)`

---

## Task 5 — Facilitator checks on live-meeting actions (S8)

**Files:** Modify `src/lib/meeting-live-actions.ts`.

**Step 1.** Add `facilitatorId` to the `getMeetingState` select (`:20`) and to the `MeetingRow` type (`:51`):

```typescript
.select({
  id: meetings.id,
  sessionState: meetings.sessionState,
  createdBy: meetings.createdBy,
  facilitatorId: meetings.facilitatorId,
})
// type MeetingRow = { id: string; sessionState: unknown; createdBy: string | null; facilitatorId: string | null };
```

**Step 2.** Add a facilitator-gated wrapper alongside `withMeetingState` (`:53`):

```typescript
async function withFacilitatorState<T>(
  meetingId: string,
  fn: (ctx: { state: MeetingSessionState; meeting: MeetingRow; user: User; space: Space }) => Promise<T> | T
): Promise<T | { error: string }> {
  return withMeetingState(meetingId, async (ctx) => {
    const authoritative = ctx.meeting.facilitatorId ?? ctx.meeting.createdBy;
    if (authoritative && ctx.user.id !== authoritative) {
      return { error: "Only the facilitator can do this" } as { error: string };
    }
    return fn(ctx);
  });
}
```

**Step 3.** Switch facilitator-only actions from `withMeetingState` → `withFacilitatorState`:
`advanceAgendaItem`, `skipAgendaItem`, `goToAgendaItem`, `startTimer`, `pauseTimer`, `resumeTimer`, `resetTimer`, `beginDecisionFlow`, `advanceDecisionStage`, `cancelDecisionFlow` (`:253`), `recordMeetingDecision`, `recordMeetingAction`, `endMeeting` (`:346`).

Leave participant actions on `withMeetingState` (membership only): `submitResponse`, `requestToSpeak`, `withdrawSpeaker`, and any participant-facing reaction/hand-raise actions.

**Note:** `withMeetingState` already scopes to the current space (it loads the meeting via `getMeetingState(meetingId, space.id)`), so these actions get S4 membership coverage for free. The facilitator gate is the additional S8 layer.

**Verify:** `npm run build`. A non-facilitator participant calling `endMeeting`/`advanceAgendaItem` from devtools gets "Only the facilitator can do this"; the real facilitator is unaffected.

**Commit:** `fix(security): gate facilitator-only live actions on meetings.facilitatorId (S8)`

---

## Task 6 — Observer role enforcement across content actions (S4)

**Files:** every mutating server-action file. This is the broadest task — work file-by-file, build between files.

**Pattern:** at the top of each mutating action, replace the bare `getCurrentSpace()` preamble with `requireSpaceRole("member")` (or `"admin"` for admin-only actions). Where an action already fetches `user` + `space` separately, collapse to the helper.

**Step 1 — enumerate.** Run `grep -rln "\"use server\"" src/lib` and review each. Apply the guard to mutating exports in (non-exhaustive — verify against current code):
- `decision-actions.ts` — create/update/delete/status/link actions → `member`
- `action-actions.ts` — create/toggle/delete → `member`
- `document-actions.ts` — create/update/publish/version/section-link/autosave → `member`
- `proposal-actions.ts` — create/update/status/comment/reference/delete → `member`
- `topic-actions.ts` — create/update/promote/delete → `member`
- `meeting-actions.ts` — create/update/delete/agenda/start → `member`
- `meeting-live-actions.ts` — already covered by Tasks 3/5 (membership + facilitator)
- `ai-actions.ts` — generation actions → `member` (in addition to existing `canUseAi`); `dismissInsight` done in Task 2
- `billing-actions.ts` — `createCheckoutSession`, `createCustomerPortalSession` → **`admin`** (only admins manage billing)
- `space-actions.ts` — member/role/danger-zone actions: keep existing **admin** checks; migrate them to `requireSpaceRole("admin")` for consistency where trivial
- `webhook-actions.ts`, `api-key-actions.ts` — already admin-gated; optionally migrate their local `requireAdmin` to the shared helper (low priority, keep if risky)

**Step 2.** For read-only query helpers in `queries.ts` — **do not** add guards (reads are already space-scoped by callers; adding role checks there would break public/embed pages).

**Step 3.** Spot-check the client side: observer-role users should see mutating controls hidden or disabled where practical (defence in depth / UX), but server enforcement is the requirement. UI hiding can be a follow-up — note any obvious spots but don't expand scope here.

**Verify:** `npm run build` after each file. Manually: sign in as an observer (set a member's role to observer in a test space) and confirm create/edit/delete actions return "You don't have permission to do this".

**Commit:** one per file or a single `fix(security): enforce observer read-only via requireSpaceRole across content actions (S4)` — prefer a few logical commits grouped by area.

---

## Task 7 — Unique index on `decisions(space_id, number)` + conflict retry (D2)

**Files:** Modify `src/db/schema.ts` (`:287` index block), `src/lib/decision-actions.ts` (create path) and/or `src/lib/queries.ts` (`getNextDecisionNumber`). Migration via temp `.cjs`.

**Step 1.** Add the unique constraint to the `decisions` table definition. `unique` must be imported from `drizzle-orm/pg-core`:

```typescript
(d) => [
  index("decisions_space_idx").on(d.spaceId),
  index("decisions_status_idx").on(d.status),
  index("decisions_date_idx").on(d.date),
  unique("decisions_space_number_unq").on(d.spaceId, d.number),
]
```

**Step 2.** Apply to Neon with a temp `run-migration.cjs` (project pattern — see CLAUDE.md "DB Migration Pattern"). The index creation will **fail if duplicates already exist**, so check first:

```javascript
const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });
const sql = neon(process.env.DATABASE_URL);
(async () => {
  const dupes = await sql`SELECT space_id, number, count(*) FROM decisions
    GROUP BY space_id, number HAVING count(*) > 1`;
  if (dupes.length) { console.error("Resolve duplicates first:", dupes); return; }
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS decisions_space_number_unq
    ON decisions (space_id, number)`;
  console.log("Done: unique index created");
})().catch(console.error);
```

Run it, confirm output, delete the script.

**Step 3.** Harden the create path against the race: wrap the decision insert in a small retry that, on a unique-violation (`23505`), recomputes `getNextDecisionNumber` and retries (2–3 attempts). Keep it minimal — the index already prevents corruption; the retry just avoids a user-facing error under concurrency. (Full transactional fix is Tranche 4a / D1.)

**Verify:** `npm run build`. Insert two decisions; numbers increment. Attempting to force a duplicate number raises the constraint and the retry resolves it.

**Commit:** `fix(integrity): unique index on decisions(space_id, number) + insert retry (D2)`

---

## Task 8 — Security headers (S6, part 1)

**Files:** Modify `next.config.ts` (currently empty).

**Step 1.** Add an `async headers()` block. App-wide: deny framing + sniffing + sane referrer/HSTS. Embed routes must stay iframe-able, so give `/embed/*` a permissive frame policy.

```typescript
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      // Embeddable widget: allow framing anywhere, drop the deny headers.
      {
        source: "/embed/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
      // Everything else: lock down framing.
      { source: "/((?!embed).*)", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
```

**Step 2.** Verify the source-path negative lookahead doesn't clobber `/embed`. Test: app pages return `X-Frame-Options: DENY`; `/embed/...` returns `frame-ancestors *` and renders in a test iframe.

**Verify:** `npm run build`; `curl -I http://localhost:3000/dashboard` and `/embed/<something>` to inspect headers.

**Commit:** `feat(security): add security headers, allow framing only on /embed (S6)`

---

## Task 9 — Webhook SSRF hardening (S5)

**Files:** Modify `src/lib/webhook-actions.ts` (`createWebhook` validation, `:29`) and `src/lib/webhooks.ts` (delivery-time guard, `:62`).

**Step 1.** Add a shared validator (e.g. in `src/lib/webhooks.ts`, exported) that rejects a URL unless: protocol is `https:`; hostname isn't `localhost`/`*.local`/loopback; and the host isn't a literal private/link-local/metadata IP (`10.`, `127.`, `169.254.`, `172.16–31.`, `192.168.`, `::1`, `fc00::/7`, `0.0.0.0`, `169.254.169.254`). Return a reason string for the UI.

```typescript
export function validateWebhookUrl(raw: string): { ok: true; url: string } | { ok: false; reason: string } {
  let u: URL;
  try { u = new URL(raw); } catch { return { ok: false, reason: "Invalid URL" }; }
  if (u.protocol !== "https:") return { ok: false, reason: "Webhook URL must use HTTPS" };
  const host = u.hostname.toLowerCase();
  const blocked =
    host === "localhost" || host.endsWith(".local") ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "::1" || host.startsWith("fc") || host.startsWith("fd") ||
    host === "169.254.169.254";
  if (blocked) return { ok: false, reason: "Webhook URL must be a public host" };
  return { ok: true, url: u.toString() };
}
```

**Step 2.** Use it in `createWebhook` (replace the bare `new URL()` try/catch) — return `{ error: reason }` on failure.

**Step 3.** Defence-in-depth at delivery: in `deliverWebhooks`, re-validate `hook.url` before `fetch` and skip (and record a failed status) if it no longer passes. (Note in a code comment: this still doesn't defeat DNS-rebind to a private IP after validation; resolving + pinning the IP is a future hardening, tracked but out of scope.)

**Verify:** `npm run build`. Creating a webhook to `http://...`, `https://localhost`, or `https://169.254.169.254` is rejected; a normal `https://example.com/hook` succeeds.

**Commit:** `fix(security): validate webhook URLs against SSRF (https + private-IP blocklist) (S5)`

---

## Task 10 — Fix API-key permissions value mismatch (B3)

**Files:** Modify `src/app/(app)/settings/api-keys.tsx` (`:178`, `:227`, `:232`).

**Canonical value is `read_write`** (underscore) — it's what the server validates/stores (`api-key-actions.ts:46`) and matches the DB convention. Fix the form + display to use it:

- `:178` — `<option value="read-write">` → `<option value="read_write">`
- `:227` — `k.permissions === "read-write"` → `k.permissions === "read_write"`
- `:232` — same comparison → `read_write`

**Verify:** `npm run build`. Create a "Read & write" key — it now succeeds and the badge renders "Read & write".

**Note (not in scope):** the review also flags that permissions are never *enforced* by any `/api/v1` route and no write endpoints exist. Enforcement is Tranche 4b (sharing/API). This task only fixes key creation.

**Commit:** `fix(api): align API-key permission value to read_write (B3)`

---

## Task 11 — Rate limiting (S6, part 2) — CONDITIONAL

> Implement **only if** the user chose Upstash (Option A) in "Decisions needed". Otherwise skip and note as deferred in the roadmap.

**Files:** new `src/lib/rate-limit.ts`; apply in `src/app/api/v1/**` handlers and `src/app/api/meetings/[id]/state/route.ts`. **New deps:** `@upstash/ratelimit`, `@upstash/redis` (ask first). **New env:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

**Sketch:** sliding-window limiter keyed by API key (for `/api/v1`) or by user id + meeting id (for polling). Return `429` with `Retry-After` when exceeded. Fail-open if Upstash env is unset (so local dev / undeployed app is unaffected).

**Verify:** `npm run build`; hammer an endpoint past the limit → `429`.

**Commit:** `feat(security): rate-limit public API and polling endpoint via Upstash (S6)`

---

## Task 12 — Export injection hardening (S7)

**Files:** Modify `src/app/api/decisions/export/route.ts`; `src/app/api/documents/[id]/export/route.ts` (read it first — line refs `:50–74` from the review).

**Step 1 — CSV formula injection.** In the decisions export, neutralise cells that start with `= + - @` (or tab/CR), which spreadsheets execute. Prefix with an apostrophe before the existing quote-escaping:

```typescript
function sanitizeCsvCell(value: string): string {
  if (value && /^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
}
// then in escapeCsv (or compose): escapeCsv(sanitizeCsvCell(value))
```

Apply to every cell (compose `escapeCsv(sanitizeCsvCell(v))` in the `rows.map`/header map).

**Step 2 — Word/HTML export escaping.** In the documents export route, HTML-escape all interpolated user content (`doc.title`, `space.name`, and any other untrusted strings) with a helper:

```typescript
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
```

Wrap each interpolation. (Tiptap-rendered body content is handled separately by the existing converter — focus on the raw string interpolations the review flagged.)

**Verify:** `npm run build`. Create a decision titled `=cmd|...` and export CSV → cell is prefixed with `'`. A document titled `<script>` exports with escaped entities.

**Commit:** `fix(security): neutralise CSV formula injection and escape HTML in exports (S7)`

---

## Task 13 — Final verification & PR

**Step 1.** `npm run lint` — no new errors (pre-existing jsx-a11y warnings OK).

**Step 2.** `npm run build` — clean.

**Step 3.** Manual security checklist:
- [ ] User from space A: `GET`/`PUT` on space B's `/api/meetings/[id]/state` → 404.
- [ ] Forged `initializeMeetingState` (other space's meeting) → "Meeting not found".
- [ ] Observer cannot create/edit/delete decisions, documents, proposals, topics, meetings; cannot start checkout.
- [ ] Non-facilitator participant cannot advance/end a live meeting.
- [ ] `removeDecisionLink` / `removeProposalReference` / `removeSectionLink` / `dismissInsight` across spaces → "not found".
- [ ] Duplicate decision number impossible (constraint holds).
- [ ] App pages send `X-Frame-Options: DENY`; `/embed/*` is iframe-able.
- [ ] Webhook to `http://`/private IP rejected.
- [ ] "Read & write" API key creates successfully.
- [ ] CSV/Word export injection neutralised.

**Step 4.** Update `STATE.md` (Known Issues — strike the closed security items) and `MISTAKES.md`/`HANDOFF.md` per project convention.

**Step 5.** Push branch, open PR:

```bash
git push -u origin security-integrity-hardening
gh pr create --title "Security & integrity hardening (review Tranche 1)" \
  --body "Closes S1–S8, D2, B3 from docs/plans/2026-06-10-full-app-review.md. See docs/plans/2026-06-10-security-integrity-plan.md."
```

**Step 6.** Run `/security-review` on the branch before requesting human review.

---

## Out of scope (deferred to later tranches)

- B4 optimistic-lock wiring of `saveState` (Tranche 2).
- D1 transactions / `neon-serverless` driver swap; full proposal-number sequence (Tranche 4a).
- API-key permission **enforcement** + write endpoints (Tranche 4b).
- Webhook DNS-rebind IP pinning, retries, delivery log (Tranche 4b).
- Client-side hiding of controls for observers beyond obvious spots (UX follow-up).
