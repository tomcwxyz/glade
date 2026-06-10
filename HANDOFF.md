# Handoff — 2026-06-10

## What happened this session

Turned the full-app review (`docs/plans/2026-06-10-full-app-review.md`) into an implementation roadmap and shipped **Tranche 1 — Security & Integrity** end-to-end on branch `security-integrity-hardening`.

### Planning artifacts
- `docs/plans/2026-06-10-review-roadmap.md` — master index, 8 tranches, just-in-time per-tranche plans.
- `docs/plans/2026-06-10-security-integrity-plan.md` — detailed task-by-task plan for Tranche 1.

### Implemented (closes S1–S8, D2, B3, S7)
1. **`requireSpaceRole` helper** (`src/lib/space.ts`) — observer<member<admin.
2. **Unscoped actions scoped (S2)** — removeDecisionLink, link/unlinkDecisionToMeeting, add/removeSectionLink, removeProposalReference, dismissInsight now verify space ownership.
3. **Live state route membership (S1)** — `getMeetingSessionStateForUser` / `isMeetingSpaceMember`; cross-tenant → 404. Removed the old unscoped `getMeetingSessionState`.
4. **`initializeMeetingState` authenticated (S3)** — signature now `(meetingId)`, identity/space derived server-side; live page call site updated.
5. **Facilitator gating (S8)** — `withFacilitatorState` wrapper on 12 control actions, keyed on `meetings.facilitatorId`; cross-participant speaker removal also gated.
6. **Observer read-only (S4)** — `requireSpaceRole("member")` across decision/action/topic/document/proposal/meeting/ai actions; billing requires admin. `getHistoricalDocument` stays readable. Also closed `generateMeetingSummary`'s `canUseAi` billing bypass.
7. **Decision number race (D2)** — unique index `decisions_space_number_unq` (applied to Neon) + `insertDecisionWithUniqueNumber` retry helper, used by all 4 creation paths.
8. **Security headers (S6)** — `next.config.ts`; framing denied app-wide, allowed only on `/embed/*`.
9. **Webhook SSRF (S5)** — `validateWebhookUrl` (HTTPS + private-IP blocklist), enforced at create + delivery.
10. **API-key value (B3)** — form/display now use `read_write`.
11. **Rate limiting (S6)** — Upstash sliding-window on `/api/v1/*` (100/60s/space) and live polling (120/60s/user+meeting); fails open without `UPSTASH_REDIS_REST_URL`/`TOKEN`. New deps: `@upstash/ratelimit`, `@upstash/redis` (owner-approved).
12. **Export injection (S7)** — CSV formula-injection neutralised; HTML/Word export escapes title/type/space name.

### Commits
One per task on `security-integrity-hardening` (12 feature commits + planning docs). `npm run build` passing, `npm run lint` clean (pre-existing a11y warnings only).

## What to do next
- **Set Upstash env vars in Vercel** (the app is live) so rate limiting is active.
- Open/merge the PR for this branch; run `/security-review` on it.
- Then plan **Tranche 2 — make broken features work** (B1 participant voting, B2 public observer, B4 lock wiring, B5 tags, B6 overdue, B8 AI type collisions, D4 autosave draft buffer).

## Build status
- `npm run build` — **passing**
- `npm run lint` — **no errors** (pre-existing jsx-a11y warnings only)
