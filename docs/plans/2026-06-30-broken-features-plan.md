# Tranche 2 — Make Broken Features Work — Implementation Plan

> **For Claude:** implement task-by-task; `npm run build` / typecheck after each; commit per task.

**Source:** [`2026-06-10-full-app-review.md`](./2026-06-10-full-app-review.md) §1.2. **Index:** [`2026-06-10-review-roadmap.md`](./2026-06-10-review-roadmap.md).
**Branch:** `tranche-2-broken-features` (stacked on `security-integrity-hardening` — depends on Tranche 1's state-route scoping for B2 and lock for B4).
**Covers:** B6, B8, B5, B4, B2, B1 (+ B10 dedup), D4.

## Decisions locked
- **D4:** draft-buffer column. Add `documents.draftContent` (jsonb) + `draftUpdatedAt`. Autosave → draft; **Save** promotes draft→content + version snapshot + clears draft; public always reads `content`. Plus an `updatedAt` conflict check on Save.

## Order (quick wins → heavy)

### Task 1 — B6: compute `overdue` at read time
`src/lib/queries.ts` `getActions` map (and any other action reads used by dashboard/lists): derive status `overdue` when `status` is `open`/`in_progress` AND `dueDate < now`. Don't persist — derive on read. Add a helper `deriveActionStatus(status, dueDate)`. Apply in `getActions`, `getActionsByTopic/Proposal` (and dashboard open-actions query if separate). Keep DB enum as-is.

### Task 2 — B8: AI insight type collisions
- Add `meeting_summary` to `insightTypeEnum` (migration via temp `.cjs`).
- `meeting-summary-actions.ts`: insert with `type: "meeting_summary"`; dedupe on `type = "meeting_summary"` AND `metadata->>'meetingId' = meetingId` (Drizzle `sql`), not the unset `relatedDecisionId`.
- `ai-actions.ts` member briefing: delete-old stays `type = "briefing"` (now only member briefings) — no longer wipes summaries.

### Task 3 — B5: tag CRUD
- `src/lib/tag-actions.ts` (new): `createTag(name, color)`, `renameTag`, `deleteTag` — all `requireSpaceRole("member")`, space-scoped; unique `(space_id, name)` guard.
- Settings UI: a "Tags" section (client component) listing tags with add/rename/delete; colour picker from the theme palette.
- `decision-form.tsx`: stop hiding the tag section when none exist — show an inline "create a tag in Settings" hint, and render `tags.color` chips. (Minimal: surface the section + link; full inline-create optional.)
- Render `tags.color` where tags display (decision detail/list chips).

### Task 4 — B4: wire optimistic locking into live state writes
All state-mutation helpers already bump `version` by 1. Add `saveWithLock(meetingId, spaceId, baseState, mutator)` in `meeting-live-actions.ts`: apply `mutator(current)`, `updateMeetingSessionState(next, next.version-1)`; on conflict re-read fresh state and re-apply (≤4 attempts); throw on exhaustion (caught by `withMeetingState` → `{error}`). Migrate every `saveState`-based action (advance/skip/goto/timers/decision-stage/submitResponse/speaker/cancel) to compute via a `(s) => …` mutator through `saveWithLock`. Remove the now-unused unconditional `saveState`. Facilitator/membership gating stays via the existing wrappers.

### Task 5 — B2: token-scoped public observer endpoint
- New `src/app/api/shared/meeting/[token]/state/route.ts` (GET): `getMeetingSessionStateByShareToken(token)` → returns `{ state, status }` only when token matches and meeting is shareable; 404 otherwise. No auth.
- `src/lib/queries.ts`: add `getMeetingSessionStateByShareToken`.
- `src/middleware.ts`: add `/api/shared` to `publicPaths`.
- `observer-view.tsx` + shared live `page.tsx`: pass `token`, fetch `/api/shared/meeting/${token}/state`.

### Task 6 — B1 (+ B10): participant consent/vote input + dedup
- **Server (B10):** `submitResponse` dedupes by `participantId` within the current flow stage — replace any existing response from this participant in this stage rather than appending; route through `saveWithLock` (Task 4). Tag each response with the stage so re-votes across stages are allowed but double-votes in one stage aren't.
- **ConsentFlow / VoteFlow (B1):** add participant-facing input (rendered when `!isFacilitator`), matching the AdviceFlow/TemperatureCheckFlow pattern:
  - Consent `react` → reaction buttons + optional comment; `object` → objection textarea + No objection / Raise objection.
  - Vote `vote` → For / Against / Abstain.
  - Show a "your response recorded — you may change it" state using the participant's own id.
- Thread the current user id from the live page → `ParticipantView` → `DecisionFlowContainer` → flows so a participant can see/replace their own response. Pass an `onSubmit` handler to ConsentFlow/VoteFlow (like AdviceFlow).
- Retire the dead stage UI in `participant-interactions.tsx` (keep only the idle "waiting for facilitator" message for the non-flow phase).

### Task 7 — D4: document draft buffer
- Schema: add `draftContent jsonb`, `draftUpdatedAt timestamp` to `documents` (migration).
- `autoSaveDocument(documentId, content)` → writes `draftContent`/`draftUpdatedAt` only (never `content`); still member-gated + space-scoped.
- `updateDocument` (Save): accept a client `knownUpdatedAt`; if the DB `updatedAt` is newer → return `{ error: "edited elsewhere" }`. On success: set `content`, bump `currentVersion`, snapshot a version, **clear** `draftContent`/`draftUpdatedAt`.
- Editor load: `content = draftContent ?? content`; show a "Draft — unsaved changes" badge when a draft exists; pass `knownUpdatedAt` through the form.
- Public/version reads unchanged (always `content`).

## Out of scope (later tranches)
- Persisting deliberation records / provenance (Tranche 3). B1 makes votes/objections work live but full persistence of the deliberation record is Tranche 3.
- Tag colour theming polish, document draft "discard" UX niceties — follow-ups.

## Verify
`npm run build` + `npm run lint` clean after each task. Manual: participant can vote/object and tallies move; observer page loads via token; overdue badges appear; generating a briefing doesn't wipe meeting summaries; editing a published doc doesn't change the public copy until Save.
