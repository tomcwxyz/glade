# Mistakes & Lessons Learned

Things that went wrong and what to do instead. This file is the most important feedback loop for improving Claude's performance on this project.

**How to use this file:**
- After every correction, add an entry here
- Tell Claude: "Add what just happened to MISTAKES.md so you don't repeat it"
- Periodically review and promote recurring patterns into CLAUDE.md as rules
- Delete entries that have been promoted to CLAUDE.md to avoid duplication

---

## Mistakes Log

### 2026-06-17
**What happened:** Committing tranche-4f P1, ran `git add -A`, which swept in two files the user had explicitly asked to keep untracked (`.claude/skills/docs-updater/` and `docs/plans/2026-03-03-crud-audit-log-design.md`). Caught it on the post-commit stat and fixed with `git rm --cached` + `--amend` (nothing was pushed).
**Why it was wrong:** `git add -A` / `git add .` ignores prior decisions about which untracked files to leave alone. Easy to silently include unrelated work.
**Rule:** When there are intentionally-untracked files in the tree, stage **explicit paths**, not `git add -A`/`.`. Always eyeball `git show --stat` before treating a commit as done.

### 2026-06-16
**What happened:** A user on the deployed app hit "server-side exception" opening any meeting or proposal. Root cause: tranche-3b's migration **dropped `meeting_proposals` directly on the shared Neon DB** while the deployed code (old `main`) still queried that table (`getMeetingById`, `getProposalMeetings`). The destructive migration reached production *ahead of* the code that no longer needed it.
**Why it was wrong:** Applying a destructive schema change (DROP/RENAME/type-change) to a shared DB before the matching code is deployed breaks the currently-running version. Additive changes (new tables/columns) are safe for old code; destructive ones are not.
**Rule:** Sequence destructive migrations *after* the code that stops using the old shape is live (expand → migrate → contract). When applying migrations directly via `.cjs`, confirm whether the deployed code still references the dropped/renamed object first. Prefer additive-only migrations whenever the change can be staged.

---

## Patterns That Didn't Work

Approaches we tried that turned out to be wrong for this project. Don't try these again.

<!--
### [Approach name]
**What we tried:** [Description]
**Why it failed:** [What went wrong]
**What works instead:** [The better approach]
-->

---

## Promoted to CLAUDE.md

Entries that have been moved into CLAUDE.md as permanent rules. Kept here for reference.

<!--
- [date]: [Rule summary] — moved to CLAUDE.md
-->
