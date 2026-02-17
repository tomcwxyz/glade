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
  - `src/app/(app)/glade/` — visual decision canvas ("The Glade")
- `src/components/` — shared React components (app-shell.tsx, sidebar.tsx, tiptap-editor.tsx)
- `src/lib/` — utilities, queries, server actions, AI integration
  - `src/lib/queries.ts` — all Drizzle DB queries
  - `src/lib/ai.ts` — Anthropic SDK client, `isAiEnabled()`, `generateText()` helper
  - `src/lib/ai-prompts.ts` — prompt templates for pattern analysis, review, document impact, briefing
  - `src/lib/ai-actions.ts` — AI server actions (analyse, review questions, document suggestions, briefing)
  - `src/lib/tiptap-utils.ts` — Tiptap JSON → plain text converter
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
> Current focus: Phase 4 (Meeting Mode) real-time features. Vercel deploy, Resend email still pending.
> Status: Phase 1–3 complete. Phase 4 schema + meeting setup done. Advanced filters + breadcrumbs done.

See PLAN.md for task tracking, STATE.md for system state.

## Known Issues

- Auth split: `auth.config.ts` (Edge) doesn't include Credentials provider — only `auth.ts` (Node) does. By design for Edge compatibility.
- Neon connection string is in `.env.local` — needs to be set in Vercel env vars before deploy
- Documents, Proposals, Topics are now live (Phase 2 complete)
- AI features require `ANTHROPIC_API_KEY` in `.env.local` and per-space toggle enabled in Settings
- `insights` table stores AI-generated content (patterns, review questions, suggestions, briefings)
- Schema now has 24 tables (added `proposal_references`, `insights` + `decidedAsDecisionId` on proposals)

## Lessons Learned

Things Claude has got wrong on this project — don't repeat these:

- (none yet)
