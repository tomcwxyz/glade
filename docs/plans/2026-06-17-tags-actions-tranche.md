# Tranche 4g — Universal tags + action editing

Branch `tranche-4g-tags-actions` (off `main` @ 4f). Build/lint clean per phase, commit per phase. Four additive join-table migrations (no destructive changes; existing untagged rows unaffected — "untagged" = absence of join rows).

## Scope (agreed)
- Make actions **editable** (description, owners, due date) via an edit modal on `/actions`.
- **Inline decision creation** from the meeting detail page (create + auto-link, no navigation).
- **Tags** on Actions, Topics, Documents, Meetings — picker + chips + `?tag=` filter, reusing the proposal-tags pattern.

## Phases

### P1 — Action editing (no migration)
- `updateAction(actionId, { description, ownerName, dueDate, ownerUserIds })` — updates the row + replaces `action_owners` in a tx; mirrors `createAction` validation.
- `getActionForEdit(actionId)` — raw editable snapshot (the list folds owners into one display string, so edit lazy-loads structured data).
- `<EditAction>` client component (inline expand, mirrors `AddAction`: description, `OwnerSelect`, date). Pencil button on `/actions` rows, gated on `canEdit`.

### P2 — Inline decision creation in a meeting (no migration)
- `createDecisionForMeeting(meetingId, { title, method, outcome })` — lightweight decision (sensible defaults) + auto-link to the meeting; reuses `persistMeetingCapture` shape.
- "Create decision" affordance in `MeetingLinksEditor` (alongside the existing link dropdown).

### P3 — Reusable tag foundation (no migration)
- Extract `<TagPicker>` from the inline chip-toggle pattern in decision/proposal forms.
- `syncEntityTags(tx, joinTable, fkColumn, entityId, tagIds)` helper (delete-then-insert).
- Retrofit decision + proposal forms/actions onto both, so there's one implementation.

### P4 — Action tags + filter (`action_tags`)
### P5 — Topic tags + filter (`topic_tags`)
### P6 — Document tags + filter (`document_tags`)
### P7 — Meeting tags + filter (`meeting_tags`)
Each: join table migration → schema + relations → `<TagPicker>` in create/edit → chips on rows → `?tag=` filter (Pagination `params` pattern).

## Migrations
Additive `CREATE TABLE` only, applied via the project `.cjs` + Neon pattern, then `db:generate` to reconcile. No backfill.
