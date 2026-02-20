# Plan — Glade

> Last updated: 2026-02-20
> Status: Phase 1–4 complete. Stripe billing ~95% done. Remaining: Vercel deploy, Resend email, Phase 5 (SaaS), spec gaps (see unchecked items)

## Objective

Build **Glade**, a decision-centric governance platform for social purpose organisations. The platform treats governance decisions as the primary unit of organisational memory — traceable, reviewable, and connected to living governance documents. Hosted SaaS with open source core.

## Approach

**Stack:** Next.js 15 (App Router), NextAuth (Auth.js v5), Neon PostgreSQL, Drizzle ORM, Tiptap editor, Anthropic API, Vercel hosting, Stripe billing, Resend email. Real-time via HTTP polling (2s interval).

**Architecture:** Event-sourced decision model. Decisions are immutable events; document state is a projection computed from the decision trail. Multi-tenant from day one via NextAuth + spaces with row-level security.

**Build order:** Five phases, each independently valuable. Phase 1 produces an MVP. Later phases add documents, AI, live meetings, and SaaS infrastructure.

---

## Phase 0 — Project Setup & Foundation

- [x] Initialise Next.js 15 project with App Router, TypeScript, Tailwind CSS
- [x] Configure ESLint and project structure (`src/app`, `src/lib`, `src/components`, `src/db`)
- [x] Set up NextAuth authentication (credentials, magic link, Google, Microsoft)
- [x] Set up Neon PostgreSQL database and Drizzle ORM
- [x] Create initial database schema (15 tables) and migration system
- [ ] Configure Vercel deployment pipeline
- [ ] Set up Resend for transactional email (provider configured, needs API key)
- [x] Establish UI component foundation (custom design system, lucide-react, clsx)
- [x] Update CLAUDE.md with actual project conventions
- [x] Build UI prototype with mock data (landing, dashboard, decisions, actions, meetings, glade canvas)

---

## Phase 1 — Core Decision Log (MVP)

### 1.1 Data Model & Schema

- [ ] `spaces` table — organisation container (name, slug, description, settings, created_at)
- [ ] `space_members` table — membership with roles (admin, member, observer)
- [ ] `decisions` table — title, description, rationale, method, outcome, status, participants, date, conditions, tags, review_date, space_id
- [ ] `decision_links` table — relationships between decisions (supersedes, relates_to, amends)
- [ ] `meetings` table — date, type, notes, space_id
- [ ] `meeting_attendees` table — meeting ↔ member join
- [ ] `meeting_agenda_items` table — ordered items with type (for_decision, for_discussion, for_information)
- [ ] `meeting_decisions` table — meeting ↔ decision join
- [ ] `actions` table — description, owner, due_date, status (open, in_progress, complete, overdue), decision_id
- [ ] `tags` table + `decision_tags` join — theme tagging (finance, HR, strategy, etc.)
- [ ] Run initial migration against Neon

### 1.2 Space Management

- [x] Space creation flow (name, slug, description)
- [x] Space switcher in navigation (cookie-based)
- [x] Member invitation flow via email link
- [x] Role management UI (admin, member, observer)
- [x] Space settings page

### 1.3 Decision Log — Core CRUD

- [x] Create decision form — all fields: title, description, rationale, method, outcome, participants, date, conditions, tags
- [x] Decision detail page — full display with linked meeting, actions, related decisions
- [x] Edit decision
- [x] Decision status lifecycle: decided → implemented → reviewed → learned
- [x] Schedule review: set review date
- [x] Tag decisions by theme (built-in + custom tags)
- [x] Link decisions to each other from UI (supersedes, relates_to, amends)
- [x] Decision status change from detail page

### 1.4 Meeting Records

- [x] Create meeting record — date, type, attendees, notes
- [x] Meeting list view
- [x] Meeting detail page — agenda, attendees, linked decisions
- [x] Link decisions to the meeting where they were made
- [x] Simple agenda: ordered list of items discussed

### 1.5 Actions

- [x] Create actions from decision form — description, owner, due date
- [x] Action status tracking: open → in_progress → complete (click-to-cycle)
- [x] Actions page — outstanding actions across the space, sorted by urgency
- [x] Overdue action highlighting

### 1.6 Views, Search & Analytics

- [x] Timeline view — all decisions in chronological order (default view)
- [x] Filter by: theme, status, method, date range, participant
- [x] Full-text search across decisions and meeting records
- [x] Simple analytics dashboard: decision count, review rate, action completion rate
- [x] Space home/dashboard page
- [x] Decision quality indicators (spec §3.4) — participation distribution, method diversity, revision frequency, document currency, time-to-decision

### 1.7 Navigation & Layout

- [x] App shell: sidebar navigation, top bar with space switcher + user menu
- [x] Responsive layout (desktop-first, mobile-usable)
- [x] Breadcrumb navigation
- [x] Loading states and error boundaries

---

## Phase 2 — Governance Documents & Proposals

### 2.1 Document Schema

- [x] `documents` table — title, type (constitution, TOR, policy, role_description, standing_orders, custom), content (JSON for Tiptap), space_id, current_version
- [x] `document_versions` table — version_number, content snapshot, decision_id that triggered the change, created_at
- [x] `document_section_links` table — link decisions to specific sections within documents

### 2.2 Document Editor

- [x] Integrate Tiptap block-based editor
- [x] Document types: constitution, terms of reference, policy, role description, standing orders, custom
- [x] Create, edit, and publish governance documents
- [x] Auto-save drafts

### 2.3 Document Provenance

- [x] Link decisions to specific sections of documents (schema + display)
- [x] Version history — what changed and which decision drove the change
- [x] Version diffs — visual diff between versions
- [x] Historical view: "show me this document as it was on [date]"
- [x] "Why does this clause exist?" — click any section to see the decision trail
- [x] Document list with last-updated indicators

### 2.4 Proposals

- [x] `proposals` table — title, description, rationale, suggested_method, status, space_id
- [x] `proposal_comments` table — threaded discussion
- [x] Create proposal with: title, description, rationale, suggested decision method
- [x] Discussion thread on each proposal: comments with replies
- [x] Proposal lifecycle: draft → open_for_discussion → ready_for_decision → decided → implemented
- [x] Attach supporting materials (links, references)
- [x] When proposal becomes a decision, prompt governance document update

### 2.5 Topics

- [x] `topics` table — title, description, type (question, tension, agenda_suggestion), space_id
- [x] Lightweight topic creation
- [x] Promote topic to proposal
- [x] Pull topics into meeting agendas

---

## Phase 3 — AI Layer

### 3.1 Infrastructure

- [x] Anthropic API integration with structured prompts and system instructions
- [x] Prompt template system — each analysis type has its own template
- [x] Per-space toggle to disable AI features entirely
- [x] `insights` table — AI-generated observations linked to decisions or the space
- [ ] Background job processing (e.g. Vercel Cron or Inngest) — deferred, using manual triggers instead

### 3.2 Pattern Analysis

- [x] Manual-trigger analysis of decision log (dashboard "Analyse patterns" button)
- [x] Surface patterns: frequently revisited decision types, consultation gaps, recurring themes
- [x] Store results as Insights linked to relevant decisions

### 3.3 Decision Review Prompter

- [x] When a decision comes up for review, generate context-aware reflection questions
- [x] Reference original rationale, concerns raised, method used
- [x] Structured review output: what happened, expected vs actual, surprises, what we'd change

### 3.4 Governance Document Intelligence

- [x] On new decision: suggest which governance documents might be affected
- [x] Flag documents not reviewed relative to recent decisions
- [x] Help draft document updates from decision text

### 3.5 Insights & Digest

- [x] Insights panel: browsable list of AI observations, dismissable or actionable
- [x] Monthly governance digest (on-screen preview, email delivery deferred until Resend configured)
- [x] New member briefing generator: "what you need to know about how we govern"

---

## Phase 4 — Meeting Mode

### 4.1 Meeting Setup

- [x] Create meeting from proposals and topics: agenda builder
- [x] Assign time estimates and decision methods per agenda item
- [x] Mark items as: for decision, for discussion, for information
- [x] Meeting status lifecycle: draft → scheduled → in_progress → completed
- [x] Edit meeting page
- [x] Shareable agenda link (public URL with share token)

### 4.2 Real-time Infrastructure

- [x] HTTP polling (2-second interval) for live state synchronisation — no new infrastructure needed, works on Vercel
- [x] Session state stored as JSONB on meetings table with version-based optimistic locking
- [x] `/api/meetings/[id]/state` — GET/PUT API route with auth + cache control
- [x] `useMeetingPoll` hook for client-side polling

### 4.3 Facilitator View

- [x] Single-screen facilitator interface: agenda sidebar, current item, timer, decision controls
- [x] Sequential agenda item navigation with skip/advance/go-to
- [x] Trigger decision method flows (consent round, vote, etc.)
- [x] Capture decisions in real-time: title, method, outcome → creates DB record
- [x] Action recording during meetings
- [x] End meeting control

### 4.4 Participant View

- [x] Join via share link (public observer view for unauthenticated users)
- [ ] QR code generation for meeting join link (spec says "QR code or short link")
- [x] Current agenda item and proposal text display
- [x] Participate in: reactions, votes, objection rounds
- [ ] Temperature checks for consensus method (quick sentiment pulse before proceeding)
- [x] Request to speak / speaker stack management
- [x] Read-only observer view for shared links

### 4.5 Consent-Based Decision Flow

- [x] Guided consent flow: present → clarify → react → object → integrate → decide
- [x] Majority vote flow: present → vote → results → record
- [x] Other methods: advice process, lazy consensus (simplified 2-stage flow)
- [ ] Delegation records: scope, constraints, reporting requirements, review date (spec §4.2 — currently just a method label)
- [ ] Advice process consultation tracking: who was consulted, what input was given (spec §4.2 — currently just a 2-stage flow)
- [ ] Configurable thresholds per method (deferred)

### 4.6 Post-Meeting

- [x] Structured meeting summary page: decisions, agenda outcomes, attendance stats
- [x] AI-generated meeting summary (when AI enabled)
- [x] Decisions automatically added to decision log from live meeting
- [x] Actions automatically created and assigned from live meeting
- [ ] PDF export of meeting record (deferred)

---

## Phase 5 — SaaS Infrastructure & Scale

### 5.1 Billing

- [x] Stripe integration for subscription billing (schema, checkout, webhooks, portal)
- [x] Free tier: 1 space, 50 decisions, 5 members, no AI/live meetings
- [x] Paid tier (Canopy): unlimited decisions, 25 members, AI, live meetings, unlimited spaces
- [x] Feature gate enforcement (server-side + client-side upgrade prompts)
- [x] Plan definitions and pricing display on landing page
- [ ] Charity/social enterprise discounted pricing (coupon codes or separate Stripe price)
- [x] Billing management UI (settings page with plan display, Stripe portal link)
- [ ] Stripe portal for self-service upgrade, downgrade, invoice access

### 5.2 Transparency Layer

- [ ] Per-space setting: public decision log, public documents, or fully private
- [ ] Configurable per-decision and per-document visibility
- [ ] Public-facing read-only pages with clean presentation
- [ ] Embeddable decision log widget

### 5.3 Onboarding

- [ ] Guided onboarding flow: create space → invite members → log first decision
- [ ] Interactive walkthrough of key concepts
- [ ] Help documentation

### 5.4 API & Integrations

- [ ] REST API for programmatic access to decision log and governance documents
- [ ] Webhook support for decision events
- [ ] Export: PDF minutes, Word governance documents, Markdown documents, CSV decision data
- [ ] Import: Markdown governance documents (convert to Tiptap JSON on ingest)
- [ ] Calendar integration for meeting scheduling and review reminders

### 5.5 Infrastructure

- [ ] File storage (Vercel Blob or S3) for meeting attachments, document exports
- [ ] Error monitoring (Sentry) and performance analytics (Vercel Analytics)

---

## Seed Data & Demo Experience

- [x] Comprehensive demo seed (`npx tsx src/db/seed.ts`) with full Riverside Trust narrative
- [x] Idempotency guard: skips if demo@glade.app exists, `--force` deletes and re-seeds
- [x] Seed covers all tables: decisions, meetings (with agenda items + notes), actions (including completed), documents (with Tiptap JSON versions + section links), proposals (with comments + references), topics (with promotion), AI insights
- [x] "Clear all data" admin action in Settings — deletes all content, preserves space + members
- [x] Decision `conditions` and `createdBy` fields populated

## Decisions Made

| Decision | Rationale | Date |
|----------|-----------|------|
| Project name: Glade | Already chosen, used in directory structure | 2026-02-14 |
| Full spec reviewed and decomposed into implementation tasks | Basis for build plan | 2026-02-14 |
| NextAuth (Auth.js v5) instead of Clerk | Self-hosted, no vendor lock-in, open source. Supports credentials + magic link + Google + Microsoft OAuth | 2026-02-14 |
| Custom design system instead of shadcn/ui | "Clearing in the Forest" theme with Fraunces + DM Sans, oklch palette. More distinctive than component library defaults | 2026-02-14 |

## Open Questions

- [x] ~~shadcn/ui vs other component library~~ — using custom design system
- [x] ~~Socket.io vs PartyKit for real-time~~ — using HTTP polling (2s interval), no WebSocket infrastructure needed
- [ ] Open source licence model (AGPL, MIT, BSL) — decide before public release
- [ ] WCAG 2.1 AA from Phase 1 or progressive enhancement?
- [ ] Which integration priorities (Google Workspace, Microsoft 365, Notion)?
- [ ] Pilot organisation identified?

## Out of Scope (deferred / module features)

- Advanced AI features (governance health dashboard, cross-space learning, natural language queries, facilitation coaching, risk flagging)
- Governance templates library (pre-built templates for common org types)
- Advanced meeting flows (sociocratic templates, anonymous voting, async decision mode, recording integration)
- Ecosystem features (governance pattern library, starter kits, community templates, benchmarking, API marketplace, white-label)
- Offline/PWA support
- White-label option

<!--
Update this file as work progresses. Tell Claude:
"Update PLAN.md to reflect what we just did, then continue with the next task."
-->
