# Handoff — 2026-02-16

## What happened this session

Implemented comprehensive demo seed data covering every feature in the app, plus a "Clear all data" mechanism in Settings for resetting to a clean slate.

### Completed

1. **Expanded seed script** — `src/db/seed.ts` now populates every table in the schema with a coherent 3-month Riverside Community Trust narrative
2. **Idempotency guard** — seed detects existing `demo@glade.app` and exits cleanly; `--force` flag deletes and re-seeds
3. **Meeting agenda items** — 12 items (3 per meeting) with `for_decision`, `for_discussion`, `for_information` types
4. **Meeting notes** — narrative notes on Feb board meeting and Jan finance committee
5. **Completed actions** — 3 new actions with `status: "complete"` and `completedAt` dates (9 total actions now)
6. **Documents with Tiptap JSON** — Constitution (published, 2 versions), Safeguarding Policy (published, 1 version), Board Member Role Description (draft)
7. **Document versions** — 4 versions with change descriptions and decision links
8. **Document section links** — 2 links (constitution sections to decisions #41 and #43)
9. **Proposals** — 4 across lifecycle: open_for_discussion, ready_for_decision, decided (linked to decision #43), draft
10. **Proposal comments** — 8 comments including 1 reply thread across 3 proposals
11. **Proposal references** — 2 external URLs (NCVO, Charity Governance Code)
12. **Topics** — 4 topics (question, tension, agenda_suggestion); 1 promoted to proposal
13. **AI Insights** — 3 insights (pattern analysis, review questions, monthly briefing)
14. **Decision fields** — `conditions` on 2 decisions, `createdBy` on all 7
15. **Clear all data** — server action + Settings UI with "type CLEAR" confirmation dialog

### Files modified

- `src/db/seed.ts` — expanded from ~440 lines to ~960 lines with full demo data + idempotency
- `src/lib/space-actions.ts` — added `clearSpaceData()` server action (deletes all content in FK-safe order, preserves space + members)
- `src/app/(app)/settings/settings-form.tsx` — added "Clear all data" section in danger zone above delete

### Seed data summary

| Table | Count | Notes |
|-------|-------|-------|
| Users | 9 | 8 named members + demo@glade.app |
| Space | 1 | Riverside Community Trust |
| Members | 9 | 2 admins (Amara, Demo), 7 members |
| Tags | 9 | service delivery, strategy, partnerships, etc. |
| Meetings | 4 | Dec–Feb, with notes on 2 |
| Agenda items | 12 | 3 per meeting, mixed types |
| Decisions | 7 | #41–#47, all statuses represented |
| Decision links | 5 | supersedes, relates_to, amends |
| Decision tags | 13 | |
| Meeting-decision links | 6 | |
| Actions | 9 | open, in_progress, complete, overdue |
| Documents | 3 | constitution, policy, role description |
| Document versions | 4 | Constitution has v1+v2, others v1 |
| Document section links | 2 | |
| Proposals | 4 | draft through decided |
| Proposal comments | 8 | Including 1 reply thread |
| Proposal references | 2 | |
| Topics | 4 | 1 promoted to proposal |
| Insights | 3 | pattern, review, briefing |

## What to do next

1. **Vercel deployment** — connect repo, set env vars, deploy
2. **Resend email** — get API key, test magic link auth
3. **Fix credentials login** — getting `Configuration` error from NextAuth when POSTing to credentials callback (may be JWT + DrizzleAdapter conflict). Google OAuth works.
4. **Test clear data flow** — log in via Google OAuth, go to Settings, test "Clear all data" button
5. **Advanced filters** — decision list: filter by theme, method, date range, participant
6. **Breadcrumb navigation** — nice-to-have
7. **Phase 4 (Meeting Mode)** ready to begin

## How to seed

```bash
set -a && source .env.local && set +a && npx tsx src/db/seed.ts          # first time
set -a && source .env.local && set +a && npx tsx src/db/seed.ts --force  # re-seed
```

Login: `demo@glade.app` / `password123` (requires credentials provider to work)

## Known issues

- **Credentials auth broken** — NextAuth returns `error=Configuration` when trying to sign in with email/password. Google OAuth works. Likely a JWT strategy + DrizzleAdapter + Credentials provider interaction issue.
- Auth split: `auth.config.ts` (Edge) doesn't include Credentials provider — by design for Edge compatibility
- Two Next.js dev servers cannot run on the same project (shared `.next` directory causes ENOENT errors)
- `npm run build` blocked by file lock when dev server is running (not a code issue)

## Build status

`npm run lint` — passing (0 warnings, 0 errors)
`npx tsc --noEmit` — passing (full project type-check)
`npm run build` — passes when dev server is stopped
