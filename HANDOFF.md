# Handoff — 2026-03-02

## What happened this session

Implemented "public by default when feature enabled" — when a space toggle (e.g. publicDecisionLog) is on, all new items default to `isPublic = true`. Users can opt out individual items via a "Hide from public page" checkbox. 1 commit, 21 files changed.

### Changes

1. **Schema default flipped** — `isPublic` column on all 6 tables (decisions, meetings, actions, documents, proposals, topics) now defaults to `true` instead of `false`.
2. **DB migration** — Bulk-updated all existing rows to `is_public = true` (0 rows needed changing).
3. **Server actions inverted** — 5 files changed from `formData.get("isPublic") === "on"` to `formData.get("hideFromPublic") !== "on"`.
4. **Form UI flipped** — 5 form components now show "Hide from public page" with `EyeOff` icon instead of "Make this X publicly visible" with `Globe`. Checkbox only appears when the space-level toggle is enabled (`publicEnabled` prop).
5. **Parent pages wired** — 9 new/edit pages now pass `publicEnabled` from `space.settings`.
6. **Decision detail badge** — Changed from green "Public" badge to muted "Hidden" badge (shown only when `isPublic = false`).

### What doesn't change

- Public page routes still gate on space settings + `WHERE isPublic = true`
- Settings form toggles unchanged
- Embed pages unchanged
- `getPublic*` queries unchanged

## Pre-existing unstaged change

`src/lib/queries.ts` has a small unrelated diff (refactoring a raw SQL `OR` to use Drizzle's `or()`/`inArray()` in `getPublicGladeDecisions`). This was already modified before this session and was **not committed** — stage and commit separately if desired.

## What to do next

- Deploy to Vercel (manual)
- Resend email setup (manual)
- Stripe production config (manual)
- Integration tasks (Google Calendar, Outlook, Notion import — see `docs/plans/2026-02-27-accessibility-and-integrations.md`)

## Build status

- `npm run build` — **passing**
- `npm run lint` — **no errors** (warnings only from pre-existing jsx-a11y rules)

<!--
Keep this file as the single source of truth for "where are we?"
The /status command reads this file.
-->
