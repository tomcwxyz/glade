# Project: Glade

A decision-centric governance platform for social purpose organisations. Treats governance decisions as the primary unit of organisational memory — traceable, reviewable, connected to living governance documents.

## Architecture

- `src/app/` — Next.js 15 App Router pages and layouts
  - `src/app/page.tsx` — public landing page (outside app shell)
  - `src/app/(app)/` — authenticated app pages (wrapped in AppShell with sidebar)
  - `src/app/(app)/dashboard/` — main dashboard
  - `src/app/(app)/decisions/` — decision log + `[number]` detail page
  - `src/app/(app)/actions/` — actions tracker
  - `src/app/(app)/meetings/` — meeting records
  - `src/app/(app)/meetings/[id]/live/` — live meeting (facilitator + participant views, decision flows)
  - `src/app/(app)/meetings/[id]/summary/` — post-meeting summary
  - `src/app/(app)/glade/` — visual decision canvas ("The Glade")
  - `src/app/shared/meeting/[token]/` — public meeting agenda + live observer (no auth required)
  - `src/app/api/meetings/[id]/state/` — GET/PUT polling endpoint for live meeting state
- `src/components/` — shared React components (app-shell.tsx, sidebar.tsx, tiptap-editor.tsx)
- `src/lib/` — utilities, queries, server actions, AI integration
  - `src/lib/queries.ts` — all Drizzle DB queries
  - `src/lib/ai.ts` — Anthropic SDK client, `isAiEnabled()`, `generateText()` helper
  - `src/lib/ai-prompts.ts` — prompt templates for pattern analysis, review, document impact, briefing
  - `src/lib/ai-actions.ts` — AI server actions (analyse, review questions, document suggestions, briefing, stale docs, draft updates, digest)
  - `src/lib/tiptap-utils.ts` — Tiptap JSON → plain text converter
  - `src/lib/meeting-state.ts` — MeetingSessionState types, createInitialState, advanceItem, etc.
  - `src/lib/meeting-live-actions.ts` — server actions for live meeting (advance, skip, timer, decision flow, speaker stack, end)
  - `src/lib/meeting-summary-actions.ts` — AI meeting summary generation
- `public/` — static assets

## Stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4 with custom `@theme` in globals.css
- **Fonts:** Fraunces (display/headings via `var(--font-display)`), DM Sans (body via `var(--font-body)`)
- **Icons:** lucide-react
- **Utilities:** clsx (class merging via `cn()` helper)
- **AI:** @anthropic-ai/sdk (Claude Sonnet 4.5, per-space toggle)
- **Diffing:** diff (document version comparison)

## Design System

The theme is "A Clearing in the Forest" — warm, editorial, trustworthy.

- **Palette:** paper (warm whites), bark (dark text), canopy (green primary), amber (warning/highlight), earth (error/overdue), moss, sky
- **Status colours:** decided (sky blue), implemented (canopy green), reviewed (amber), learned (earth)
- **Colour tokens** are defined as oklch values in `src/app/globals.css` under `@theme`
- Use semantic colour names (`text-bark-muted`, `bg-canopy-pale`, `border-border`) not raw values
- Display headings use `style={{ fontFamily: "var(--font-display)" }}`
- Body text sizes use `text-[0.8125rem]` (13px) for UI, `text-[0.9375rem]` (15px) for content

## Commands

- `npm run dev` — start dev server (Turbopack)
- `npm run build` — production build
- `npm run lint` — ESLint check
- `npm start` — serve production build

## Standards

- Server Components by default; add `"use client"` only when needed (state, effects, browser APIs)
- Route groups: `(app)` for authenticated pages with sidebar, root for public pages
- Page components are default exports; shared components are named exports
- All data comes from Drizzle queries in `src/lib/queries.ts`
- Date formatting uses `src/lib/utils.ts` helpers: `formatDate`, `formatDateRelative`, `formatDateMonth`
- en-GB locale for dates (day month year)

## Verification

- Run `npm run build` after structural changes to confirm nothing breaks
- Run `npm run lint` before considering any task complete
- Check the dev server renders correctly after UI changes

## Working Rules

- Always check for existing patterns before creating new ones
- Prefer small, incremental changes over big rewrites
- If a task will take more than ~50 lines of changes, use plan mode first
- Don't add dependencies without asking
- Don't refactor code that wasn't part of the task
- Don't create files without explaining what and why

## State & Progress

> Updated: 2026-02-17
> Current focus: Vercel deploy, Resend email still pending. Phase 5 (SaaS) next.
> Status: Phase 1–4 complete. All schema columns applied to Neon DB.

See PLAN.md for task tracking, STATE.md for system state.

## Known Issues

- Auth split: `auth.config.ts` (Edge) doesn't include Credentials provider — only `auth.ts` (Node) does. By design for Edge compatibility.
- Neon connection string is in `.env.local` — needs to be set in Vercel env vars before deploy
- Documents, Proposals, Topics are now live (Phase 2 complete)
- AI features require `ANTHROPIC_API_KEY` in `.env.local` and per-space toggle enabled in Settings
- `insights` table stores AI-generated content (patterns, review questions, suggestions, briefings)
- Schema now has 24 tables (added `proposal_references`, `insights` + `decidedAsDecisionId` on proposals)
- `meetings` table has `status` (meeting_status enum), `shareToken` (varchar 64, unique), `sessionState` (jsonb)
- `meeting_agenda_items` table has `status` (agenda_item_status enum), `durationMinutes`, `proposalId`, `topicId`
- Live meeting uses HTTP polling (2s interval) via `/api/meetings/[id]/state` — no WebSocket infrastructure needed
- Drizzle migrations may be behind schema.ts — columns were applied via direct SQL. Run `db:generate` to reconcile.

## Lessons Learned

Things Claude has got wrong on this project — don't repeat these:

- **Don't call `cookies().set()` during rendering.** In Next.js 15, cookies can only be modified in Server Actions or Route Handlers. The `getCurrentSpace()` function tried to set a fallback cookie during layout rendering — this crashes at runtime. Read cookies freely, but only set them from actions.
- **Always apply DB migrations before committing schema changes.** Drizzle schema.ts was updated with new columns/enums but `db:push` wasn't run (it requires interactive input that's hard to automate). The dev server then crashed because queries included columns that didn't exist in the database. Apply migrations immediately after schema changes.
- **`npm run db:push` doesn't load `.env.local` automatically** and requires interactive prompts. For ad-hoc migrations, write a temp `.cjs` script that loads env manually and uses `neon().query()` (not tagged template — use `.query()` method with Neon serverless).
- **React hooks must come before early returns.** `useCallback` placed after `if (!flow) return null` triggers the rules-of-hooks ESLint error. Always put all hooks at the top of the component.
- **When two functions in a file end with identical code,** the Edit tool's `old_string` will match both. Use `Write` to rewrite the file, or include enough unique surrounding context.
