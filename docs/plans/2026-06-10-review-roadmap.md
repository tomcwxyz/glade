# Full-App Review — Implementation Roadmap (Index)

**Source:** [`2026-06-10-full-app-review.md`](./2026-06-10-full-app-review.md) — seven-pass review of commit `93098d0`.
**Approach:** ship in tranches. Each tranche gets its own detailed, executable plan doc written **just before** it is implemented (so references stay fresh against the current code). This index tracks the sequence.

> One tranche in flight at a time. Don't write a tranche's detailed plan until the previous tranche is merged — file/line references drift fast in this codebase.

| # | Tranche | Detailed plan | Branch | Status |
|---|---------|---------------|--------|--------|
| 1 | **Security & integrity** (S1–S8, D2, B3, S7) | [`2026-06-10-security-integrity-plan.md`](./2026-06-10-security-integrity-plan.md) | `security-integrity-hardening` | ✅ Implemented — PR open |
| 2 | Make broken features work (B1, B2, B4, B5, B6, B8, B10, D4) | [`2026-06-30-broken-features-plan.md`](./2026-06-30-broken-features-plan.md) | `tranche-2-broken-features` | ✅ Implemented — stacked on Tranche 1 |
| 3 | Traceability release (provenance panel, `decision_responses`, proposal↔meeting unification, review workflow) | `~/.claude/plans/steady-frolicking-eagle.md` | `tranche-3b-traceability` | ✅ Implemented — stacked on Tranche 3a |
| 4a | Performance (React.cache, detail-page Promise.all, pagination, indexes, neon-serverless txns, `waitUntil`) | `~/.claude/plans/steady-frolicking-eagle.md` | `tranche-4a-performance` | ✅ Implemented — stacked on Tranche 3b |
| 4b | Sharing/transparency (readable public docs, decision permalinks, RSS, sitemap, per-item action hide, export) | _tbd_ | _tbd_ | ⏳ Not started |
| 4c | Canvas (stable hashId jitter, drag-pan, legend filters, memoised layers, distinct status colours) | _tbd_ | _tbd_ | ⏳ Not started |
| 4d | AI (structured outputs + model upgrade, error handling, input caps → governance Q&A, agenda drafting, auto-tagging) | _tbd_ | _tbd_ | ⏳ Not started |
| 4e | Engagement (notifications + review-due digest, pending-invite mgmt, global search/command palette, user profile) | _tbd_ | _tbd_ | ⏳ Not started |

## Sequencing rationale

- **Tranche 1 first** — the review's own verdict: "fix before anything else." These are small diffs with outsized risk (cross-tenant IDOR, unauthenticated state reset, missing role checks). Low surface area, no new product behaviour, mergeable in days.
- **Tranche 2 next** — flagship features that are currently broken (participants can't vote, public observer never loads). High user-visible value, contained scope.
- **Tranche 3** — the core product promise (traceability). Schema work + new UI; depends on Tranche 2's deliberation flows being correct.
- **Tranche 4a–4e** — parallelisable tracks once the foundation is solid. Order within is by impact/effort, not dependency.

## Notes

- Tranche 1 deliberately pulls **S7 (export injection)** forward from review §1.1 even though it's not in the review's explicit Week-1 list — it's a small security fix that fits the same branch.
- **D1 (no transactions / `neon-http`)** and the full proposal-number race fix are deferred to Tranche 4a, where switching the driver to `neon-serverless` is the natural home. Tranche 1 adds the unique index (D2) as a safety net so duplicates become a catchable constraint error in the meantime.
- Rate limiting (part of S6) needs an external service decision (Upstash vs Vercel WAF) — see the Tranche 1 plan's "Decisions needed" section.
