# Glade — Full Application Review

**Date:** 2026-06-10
**Status:** Findings report — no fixes applied
**Method:** Seven parallel code-review passes (decisions/actions, meetings, documents/proposals/topics, Glade canvas, AI layer, sharing/API/exports, cross-cutting performance & auth), each reading the relevant source in full.

**Headline:** the product surface is broad and the craft is high, but there is a layer of security holes, a handful of outright-broken flagship features, and a consistent pattern of "the schema supports it, the UI never shows it" — a traceability gap at the heart of a traceability product.

---

## 1. Critical — fix before anything else

### 1.1 Security

| # | Finding | Where |
|---|---------|-------|
| S1 | **Cross-tenant IDOR on live meeting state (read AND write).** GET/PUT check only that a session exists, never space membership. Any signed-in user of any org can read another org's live decision rounds and overwrite their session state with arbitrary JSON. | `src/app/api/meetings/[id]/state/route.ts:10-13,36-39`, `src/lib/queries.ts:409-438` |
| S2 | **Five unscoped delete-by-ID server actions** — no space/ownership check: `removeDecisionLink` (decision-actions.ts:254), `unlinkDecisionFromMeeting` (:281), `removeSectionLink` (document-actions.ts:173), `removeProposalReference` (proposal-actions.ts:228), `dismissInsight` (ai-actions.ts:37). Also `linkDecisionToMeeting` (decision-actions.ts:258) and `addSectionLink` (document-actions.ts:160) never verify target IDs belong to the caller's space. | as listed |
| S3 | **`initializeMeetingState` is an unauthenticated server action** — caller-supplied userId/spaceId, no checks; anyone can reset any meeting's live state and flip it to in_progress. | `src/lib/meeting-actions.ts:292-313` |
| S4 | **Observer role is cosmetic.** No content server action checks role anywhere — observers can create/edit/delete decisions, documents, meetings, and start Stripe checkout. Fix systematically with a `requireSpaceRole(minRole)` helper. | all content action files; `billing-actions.ts:22,57` |
| S5 | **Webhook SSRF** — only `new URL()` validation; admins can register internal/metadata-service URLs which the server then POSTs to. Require HTTPS, block private IP ranges. | `src/lib/webhook-actions.ts:29-33`, `src/lib/webhooks.ts:62` |
| S6 | **No rate limiting anywhere; no security headers at all.** `next.config.ts` is empty — the authenticated app can be iframed (clickjacking); `/api/v1` and the 2s polling endpoint are unthrottled. Add `headers()` (`frame-ancestors 'none'` app-wide, `frame-ancestors *` for `/embed/*`, HSTS, nosniff) + Upstash rate limiting. | `next.config.ts:3` |
| S7 | CSV formula injection in decision export (leading `=`/`+`/`-`/`@` unescaped); unescaped HTML (`doc.title`, `space.name`) in Word export. | `api/decisions/export/route.ts:6-11`, `api/documents/[id]/export/route.ts:50-74` |
| S8 | Live-meeting facilitator actions (advance, end, timer, cancel flow) check membership only, never `isFacilitator` — any participant can end the meeting from devtools. | `src/lib/meeting-live-actions.ts:53-68` |

### 1.2 Broken features (do not currently work)

| # | Finding | Where |
|---|---------|-------|
| B1 | **Participants cannot respond in consent or vote flows.** `ParticipantInteractions` early-returns "Waiting for facilitator" in the only state it renders — unreachable dead code. Consent rounds get no objections; vote tallies are permanently 0/0/0. Only advice + temperature-check have working participant input. | `participant-view.tsx:263-279`, `participant-interactions.tsx:34-43`, `vote-flow.tsx:39-44` |
| B2 | **Public live observer never loads** — polls the authenticated state endpoint, silent 401, spins forever. Needs a token-scoped public endpoint (do NOT open the id-based route — see S1). | `observer-view.tsx:40-56`, `src/middleware.ts:10` |
| B3 | **"Read & write" API keys impossible to create** — form sends `read-write`, server accepts `read_write`; every attempt errors. Permissions are also never checked by any route, and no write endpoints exist. | `api-keys.tsx:178,227` vs `api-key-actions.ts:46` |
| B4 | **Optimistic locking built but never used.** Version-checked PUT path exists; all real writes go through unguarded read-modify-write `saveState`. Concurrent actions silently lose votes/speaker-stack entries. | `meeting-live-actions.ts:34-39` vs `queries.ts:419-438` |
| B5 | **Tags unusable in real spaces** — no tag CRUD anywhere (seed data only); decision form hides the tag section when none exist. `tags.color` stored, never rendered. | `decision-form.tsx:382`, `schema.ts:323` |
| B6 | **`overdue` action status never computed** — nothing compares dueDate to now; badges will never appear on production data. Derive at read time. | `schema.ts:41`, `queries.ts:186-240` |
| B7 | Timer "Resume" restarts from zero (paused elapsed discarded). | `meeting-timer.tsx:107-115`, `meeting-live-actions.ts:96-113` |
| B8 | **AI type collisions:** generating a member briefing deletes digests AND meeting summaries (all `type="briefing"`); meeting-summary dedupe filters on `relatedDecisionId` it never sets → duplicates accumulate per click; summary lives only in client state, persisted insight never re-read. | `ai-actions.ts:264-271`, `meeting-summary-actions.ts:53-75` |
| B9 | Dead `href="#"` meeting link on decision detail; dashboard "Reviews coming up" unsorted and includes long-past reviews. | `decisions/[number]/page.tsx:224`, `dashboard/page.tsx:114` |
| B10 | Temperature-check `hasVoted` logic wrong; `submitResponse` never dedupes by participant — double voting in all flows. | `temperature-check-flow.tsx:28-30`, `meeting-live-actions.ts:183-212` |
| B11 | Poll errors never rendered (views destructure state/loading only) — users get a silently frozen meeting; `withMeetingState` swallows all errors including auth redirects. | `use-meeting-poll.ts:27-30`, `meeting-live-actions.ts:65-67` |

### 1.3 Data integrity

| # | Finding | Where |
|---|---------|-------|
| D1 | **No transactions anywhere — and `neon-http` can't do them.** Decision+tags+actions, document update+version snapshot, agenda delete-and-reinsert are multi-commit sequences that can fail halfway. Fix: `neon-serverless` driver for actions. | `db/index.ts:2`, `decision-actions.ts:49-103`, `document-actions.ts:88-106` |
| D2 | **Decision number race** — `max(number)+1`, no unique index on `(space_id, number)`. Concurrent creates mint duplicate decision numbers. | `queries.ts:637-643`, `schema.ts:287-291` |
| D3 | **Live state is index-keyed** (`completedItems[3]`, `currentAgendaItemIndex`); `updateMeeting` allows editing in-progress meetings and delete-reinserts all agenda items with new UUIDs — outcomes silently reattach to wrong items. Key by agenda-item UUID; block agenda edits while live. | `meeting-state.ts:43-53`, `meeting-actions.ts:168-201` |
| D4 | **Autosave mutates live published documents** — writes straight to `documents.content` 1.5s after keystroke, no draft buffer, no version snapshot; public sees the change before "Save" is clicked. No concurrent-edit conflict detection (last-write-wins). | `document-actions.ts:185-203`, `document-form.tsx:70-86` |
| D5 | Cascade inconsistencies: `proposals.decidedAsDecisionId` etc. have no `onDelete` (manual nullification); `meeting_agenda_items.proposalId/topicId` no `onDelete` (FK violation on proposal delete); `proposal_comments.parentId` has no FK at all. `clearSpaceData` non-atomic ("Some data may remain"). | `schema.ts`, `space-actions.ts:272-279` |
| D6 | Recorded decision + advance is two-step client orchestration — double-click duplicates decisions; no idempotency. | `facilitator-view.tsx:115-126` |

---

## 2. Traceability gaps (the core product promise)

The schema supports the links; the UI shows them one-way. The decision detail page is blind to most of its own provenance:

| Link | Schema support | Currently shown? |
|---|---|---|
| Decision → originating proposal | `proposals.decidedAsDecisionId` | Proposal side only |
| Decision → documents it changed | `document_section_links`, `document_versions.decisionId` | Document side only (no reverse query exists) |
| Topic → proposal → decision lineage | both FKs | One hop, one direction |
| Decision → meeting made in | exists | Dead `#` link |
| Proposal → agendas it's on | **two parallel unsynced tables**: "Add to agenda" writes `meeting_agenda_items.proposalId` (meeting-actions.ts:522); proposal page reads `meeting_proposals` (queries.ts:610) | Invisible — looks like the action failed |
| Decision → deliberation record (votes/objections/advice) | **not persisted** — flow responses wiped on advance; vote counts squashed into outcome string | Lost forever |
| Meeting → actual attendance | `participants` map only ever contains the facilitator; `lastSeenAt` never touched | "Participants: 1" forever |
| Decision → agenda item | jsonb index only, not DB | Fragile (see D3) |

**Highest-value product fix: a provenance panel on the decision detail page** — "Raised as topic → discussed as proposal (12 comments) → decided at March board meeting by consent (0 objections) → changed Constitution §4." Pair with a `decision_responses` table persisting deliberation records at `recordMeetingDecision` time.

Also: `documentVersions.decisionId` is rendered in version history but no app code ever sets it (seed only) — a display-only feature users can't produce. Insights with `relatedDecisionId` aren't surfaced on the decision they relate to.

---

## 3. Half-developed features by area

### Decisions & Actions
- **Review workflow is decorative**: review dates set, nothing happens when they pass — no overdue-review state, no notification; marking "reviewed" captures no outcome. Build: due queue → review action capturing keep/amend (auto-`amends` link)/supersede/retire.
- **"Learned" captures nothing** — one-click flip, no learnings field in schema. Prompt for "what we learned"; feed pattern analysis.
- Participants are free-text strings, not user FKs (renames break filters; no per-person history). `actions.ownerId` FK exists but is never set — no "my actions" view possible.
- Actions can't be edited (only toggle/delete); can't be added from the decision detail page (section hidden when empty).
- `conditions` captured in form, never displayed (page renders Context/Rationale/Outcome only).
- No superseded-by badge in log or detail — readers can act on dead decisions.
- Status/method enums cast from FormData without validation; lifecycle can jump arbitrarily.
- No `decision.deleted` webhook despite audit log capturing it.

### Meetings
- Skipped items are a dead end — no return-to-skipped prompt before end, no carry-forward; revisiting then advancing overwrites the original entry including a recorded decisionId (`meeting-state.ts:93-101`).
- No reopen after "End meeting"; End has no confirmation dialog.
- In-live action recording (`recordMeetingAction`, meeting-live-actions.ts:315) implemented server-side, **no UI calls it**.
- Notes / AI summary / print page are three disconnected things — no durable approvable minutes.
- No recurring meetings, no calendar invites/.ics.
- `meeting_agenda_items.status` column is dead (never read/written).
- "Consensus" offered in quick-record but has no flow; lazy consensus flow's record stage points at a button not visible during the flow.
- Polling never stops (hidden tabs, completed meetings) and never backs off.
- Share link ignores `isPublic` (returns hidden meetings incl. attendee list).
- Transcript-imported decisions/actions skip proposal/topic/agenda linkage; extracted topics not linked to the meeting.

### Documents, Proposals, Topics
- **Delete built server-side for all three (with audit snapshots) — zero UI call sites.** Topics can't be edited at all (no updateTopic, no edit route).
- **Decision trails keyed on heading text** — rename a heading, trail silently vanishes, orphaned row stays. Use Tiptap UniqueID node attributes; render badges inline next to headings.
- No version restore (view/diff only). Diff is plain-text — mark/link/structure changes show "No differences found".
- Comments: `deleteProposalComment` exists (author-checked), no UI; no editing, mentions, or notifications.
- No proposal deadlines/discussion windows despite lazy consensus being defined by an objection window. Status advance forward-only, unvalidated, no withdrawn/rejected terminal state.
- No archiving anywhere — only hard delete; document delete cascades all versions (contradicts audit ethos).
- No search/filter on any of the three list pages; no document folders/tags; no templates despite the type enum.
- Proposal references are external URLs only — can't reference internal documents/decisions/proposals.
- Editor: links unclickable in read-only mode (`openOnClick: false` applies to viewers); markdown import drops inline syntax (bold/links literal); exports drop links/underline; "Word" export is HTML-in-.doc; no tables/images/task-lists; H1/H4+ from import can't be authored (editor allows H2/H3 only); autosave status not in aria-live (save failures inaudible to AT users).
- Markdown import silently replaces existing content, no confirmation.

### Cross-cutting
- **Notifications: none** (no in-app, no email beyond auth/invites). Review dates tracked, nobody ever told.
- **User profile: none** — no name/avatar editing; credentials users keep sign-up name forever.
- **Pending invitations invisible** — `getPendingInvitationsForSpace` exists, unused; no list/resend/revoke; `expired` enum never set.
- **No global search** across entities. No keyboard shortcuts/command palette. No dark mode.
- Activity log = deletions only, capped 50, no paging. Walkthrough localStorage-only (replays per device).
- No last-admin guard — sole admin can demote themselves, space becomes unmanageable.
- Plan gating: mostly server-side (good), but `createDecisionFromProposal` + live-meeting recording bypass the decision limit; `maxSpaces: 1` never enforced; Stripe webhook hardcodes `planTier: "pro"`; `canUseLiveMeetings` helper exists, apparently never called.

---

## 4. Performance

Query layer is clean (no N+1 loops, good `inArray` batching, correct `Promise.all` in list hydration) but three systemic issues:

1. **No pagination anywhere.** Decisions list ships entire history with full text to a client component; actions/meetings/proposals/topics/documents/admin lists unbounded. Dashboard fetches ALL decisions/actions/meetings to render 4+4+3 rows — ~20+ DB round-trips per load (each an HTTP hop on neon-http). `getSpaceStats` fetches all rows to `.filter().length` in JS (use `count(*) FILTER`).
2. **No caching at all** — zero `unstable_cache`/`React.cache`/`revalidate` in src/. `getCurrentSpace()` (auth + membership join) runs in layout AND every page. `React.cache()` wrap = free ~2× cut in auth round-trips. `getSpaceMemberCount` fetches all rows for `.length`.
3. **Sequential waterfalls on detail pages** — `getDecisionByNumber` 6 serial queries (queries.ts:120-180); same pattern in `getDocumentById` (:687) and `getProposalById` (:819). Detail pages also eagerly load whole-space lists for link-picker dropdowns behind buttons.

Missing indexes: unique `decisions(space_id, number)` (also D2); `subscriptions.stripeSubscriptionId` (Stripe webhook filters on it); `actions.topicId/proposalId/ownerId`; `document_section_links.decisionId`, `document_versions.decisionId`, `insights.relatedDecisionId`, `proposals.decidedAsDecisionId`, `topics.promotedToProposalId`, `meeting_agenda_items.proposalId/topicId`; unique `tags(space_id, name)`; unique `decision_links(from,to,type)`.

Other: webhooks fire-and-forget then `redirect()` — on Vercel serverless they'll silently drop (use `waitUntil`); polling downloads full sessionState every 2s even unchanged (add `?since=version` → 304; pause on hidden tab; stop on completed); `getMeetings` selects all columns incl. full transcript + sessionState jsonb for the list page; transcript import runs `getNextDecisionNumber` + inserts per decision in a sequential loop.

---

## 5. The Glade canvas

Craft level is unusually high (seeded organic tree geometry, lifecycle-encoded morphology, aged roots, dappled light, ground cover, proper server-side public gating). Structural gaps:

| P | Finding | Ref (glade-canvas.tsx) |
|---|---|---|
| High | **Forest reshuffles when any decision is added** — jitter from one shared sequential RNG consumed in array order. Fix: derive from `hashId(d.id)` (function exists, :152). | :209,236 |
| High | **Fixed 1200×750 world + MIN_ZOOM=1 caps ~50–60 trees** — degrades exactly when the product succeeds. Size world by node count; fit-to-extent zoom. | :803,969 |
| High | **No mouse-drag pan on desktop** (wheel-zoom + touch-pan only). | :863-951 |
| High | **No filtering or search on canvas** — make the legend clickable status filters; search that pans to match. | — |
| High | Full-SVG re-render on every hover/zoom frame; nothing memoised below top level; per-node Gaussian-blur filters. Split into memoised GroundCover/RootLayer/TreeLayer; CSS hover. | :1502,1555 |
| High | **Keyboard nav absent on canvas** (sr-only list exists; `useLiveRegion` wired — arrow-key traversal is mostly plumbing). | :1188,1834 |
| High | **decided vs implemented greens nearly indistinguishable** — the two most common statuses. | :86-95 |
| Med | Clusters use `tags[0]` + hard-coded seed-data taxonomy; real orgs all land in hash fallback; linked decisions don't attract. | :127-138,234 |
| Med | No hover preview; no fit-to-selection; flat background weakens "clearing" metaphor; viewMode not persisted; stale-closure zoom announcements. | :1858,1122,963,975 |
| Low | Public empty state bare `<p>`; readOnly tooltip dead-ends (no link to public record); tooltip height guessed (280, can clip); O(n²) in `getPublicGladeDecisions`. | public page :33; :780; :707; queries.ts:1255 |

**Differentiating ideas:** time playback ("watch your forest grow" — all data present, client-side); decisions past reviewDate visibly wilting (ambient review-debt radar); seasonal/time-band layout (solves scaling too); document trees + meeting clearings; drag-a-root to create decision links; shareable camera state in URL hash.

---

## 6. AI layer

### Robustness
- **Switch to structured outputs** (`messages.parse` + Zod) — every JSON feature relies on "respond ONLY with JSON" prompts + a fence-stripper that only handles fences at string edges. Requires upgrading the pinned legacy `claude-sonnet-4-5-20250929` (ai.ts:31) → `claude-sonnet-4-6` (same price); use `claude-haiku-4-5` for extraction/classification (3–5× cheaper). Set low effort for short tasks.
- **Stuck-spinner bug:** thrown API errors propagate; client handlers have no try/catch → `setLoading(false)` skipped, button bricked until refresh (insights-panel.tsx:29, member-briefing.tsx:22). Return `{error}` from actions; try/finally in clients.
- **No input caps:** pattern analysis sends ALL decisions with full text; transcript extraction unbounded with maxTokens 4096 and no `stop_reason` check — long meetings → misleading "parse failed". Cap with clear UI message.
- **Prompt injection:** user content interpolated undelimited; pattern/stale-doc output lands on dashboard with no review step. Wrap in XML tags. (Transcript preview/edit stage is a good existing control.)
- **Gating:** `generateMeetingSummary` skips `canUseAi` (billing bypass); `dismissInsight` no auth (see S2).
- Blocking 30–60s server actions risk Vercel maxDuration — stream long generations.
- No usage/cost telemetry — log `message.usage` per space/feature (needed for Canopy pricing).

### Half-developed
- Insights never refresh automatically; regeneration deletes ALL pattern insights including dismissed → dismissed insights resurrect. Keep dismissed rows, pass to prompt.
- Digest "monthly" in name only — no cron, no email (Resend is right there). The member who'd benefit never sees it.
- Briefing not wired to the new invite flow — generate at invite-accept.
- Review questions write-only — answers go nowhere; cached forever, no invalidation on edit. (Pairs with the missing review workflow.)
- `suggestion` insights stored but never rendered (insights-panel filters to `pattern` only).
- `draftDocumentUpdate` ephemeral — feed the version/diff machinery instead.
- Document-impact/stale-doc prompts get titles only — the model is guessing; a stored 1-2 sentence summary per document would transform quality. Send short indices, not UUIDs, for ID round-trips. No few-shot examples anywhere (extraction would benefit most). Today's date never provided (stale/digest prompts can't ground "recent").

### Missed opportunities (ranked)
1. **"Ask your governance record" Q&A** with citations to decision numbers — the killer feature for a memory product; small-org records fit in context, no embeddings infra needed; textbook prompt-caching case.
2. Agenda drafting from open proposals/topics/overdue reviews (the topic type enum literally exists for this).
3. Decision-conflict detection (dedicated pairwise check → `conflict` insights linking two decision numbers).
4. Haiku auto-tagging on decision creation from the space's tag vocabulary (<$0.001/call).
5. Decision-quality coaching at capture (empty rationale, no review date).
6. Semantic search (pgvector on Neon) — defer behind #1.

---

## 7. Open sharing / transparency layer

Foundations are right: public queries strictly AND `isPublic` + section toggles; documents additionally require published; API keys (160-bit, SHA-256, shown once, expiry) and share tokens (~122-bit, revocable) well-built. But the layer shows *that* an org decides things, not *what* or *why*:

| P | Finding | Where |
|---|---|---|
| High | **Public documents unreadable** — query doesn't select content; titles only. A public constitution you can't open. | `queries.ts:1058-1070` |
| High | **No public detail pages/permalinks** — no citable URL for decision #47; public decisions are list rows only. | no `[id]`/`[number]` routes under `src/app/public/` |
| High | **`/public/[space]` is a redirect, not a landing page** — no org profile/stats/timeline. | `public/[spaceSlug]/page.tsx:25-29` |
| High | **Sitemap omits all public space pages**; public pages have title-only metadata, generic OG image, no JSON-LD. | `sitemap.ts`, `public/.../page.tsx:14` |
| High | **Actions are public-by-default with NO hide checkbox** — only entity missing the opt-out; exposes `ownerName` + due dates the moment the toggle flips. | `action-actions.ts` (never sets isPublic), forms |
| Med | Personal names on public pages (proposal/topic creators, action owners, glade participants, shared-agenda attendees) — GDPR; at minimum warn in settings. | `queries.ts:1166-1204` etc. |
| Med | **No RSS/Atom feed** — cheapest "follow this org" feature. | — |
| Med | Webhooks: 3 decision events only; fire-and-forget (drops on serverless); no retries/delivery log/event id. Embed: decisions only, no params (limit/tag/theme). | `webhooks.ts:6-9,24` |
| Med | API: only /decisions paginates (offset unguarded); actions/meetings/documents are unbounded dumps; unvalidated status casts → 500s; no proposals/topics/single-meeting endpoints; no OpenAPI/docs; no ETag/rate-limit headers. | `api/v1/**` |
| Med | **No full-space export/backup** — users can't take their memory with them (GDPR Art. 20). No import (Loomio/CSV/Docs) — empty-room adoption problem. | — |
| Low | No noindex on /shared/ or /embed/ (robots disallow ≠ noindex); robots path-prefix list fragile; hardcoded ourglade.app base URL. | `robots.ts` |

**Trust-building roadmap (impact order):** readable public docs + decision permalinks → RSS/email subscribe → public governance timeline on a real landing page → AI annual "Year in Governance" report (digest machinery exists; funder-facing) → embeddable governance-health badge (like CI badges) → verified org profiles (charity number lookup) → opt-in public directory of open-governance orgs.

---

## 8. Suggested priority order

**Week 1 — security & integrity (small diffs, big risk)**
1. Space-scope `/api/meetings/[id]/state` + the five unscoped actions + `initializeMeetingState` (S1–S3)
2. `requireSpaceRole` helper; enforce observer + facilitator checks (S4, S8)
3. Unique index `decisions(space_id, number)` (D2)
4. Security headers + webhook URL validation + rate limiting (S5–S6)
5. Fix API-key `read-write`/`read_write` mismatch (B3)

**Week 2 — make broken things work**
1. Participant consent/vote responses (B1) — flagship feature
2. Wire `saveState` through the existing optimistic lock (B4)
3. Token-scoped observer state endpoint (B2)
4. Tag CRUD in Settings (B5); compute `overdue` at read time (B6)
5. Autosave draft buffer + updatedAt conflict check (D4)
6. AI type collisions + stuck spinners (B8, robustness)

**Weeks 3–4 — the traceability release**
1. Decision provenance panel (proposal ← topic lineage, meeting, affected documents)
2. Persist deliberation records (`decision_responses` table)
3. Unify the two proposal↔meeting link tables
4. Review workflow: due queue → review outcome (keep/amend/supersede/retire) + learning capture on "learned"
5. Render `conditions`; superseded badges; fix dead meeting link

**Parallel tracks thereafter**
- **Performance:** React.cache on getCurrentSpace/requireUser; Promise.all the detail waterfalls; pagination; missing indexes; neon-serverless transactions; waitUntil for webhooks
- **Sharing:** readable public docs, decision permalinks, RSS, sitemap, per-item hide for actions, full-space export
- **Canvas:** stable layout (hashId jitter), drag-pan, legend filters + search, memoised layers, distinct status colours — then time playback + review-wilting
- **AI:** structured outputs + model upgrade, error handling, input caps — then governance Q&A, agenda drafting, auto-tagging
- **Engagement:** notifications table + review-due email digest (Vercel cron + Resend), pending-invite management, global search/command palette, user profile editing

---

*Generated from seven parallel review passes on commit `93098d0`. File/line references are accurate as of that commit.*
