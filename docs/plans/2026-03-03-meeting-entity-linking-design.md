# Meeting-Entity Linking

> Date: 2026-03-03
> Status: Design

## Summary

Add bidirectional linking between meetings and four entity types: decisions, actions, documents, and proposals. Users can manually link/unlink from both the meeting detail page and each entity's detail page.

## Background

- `meeting_decisions` join table already exists in the schema, and `recordMeetingDecision` auto-links during live meetings
- No UI exists to manually link/unlink decisions to meetings
- Actions, documents, and proposals have no meeting link at all
- Proposals are only indirectly associated via `meeting_agenda_items.proposalId`

## Schema

Three new join tables matching the existing `meeting_decisions` pattern:

```sql
meeting_actions (
  meetingId uuid FK → meetings(id) ON DELETE CASCADE,
  actionId uuid FK → actions(id) ON DELETE CASCADE,
  PRIMARY KEY (meetingId, actionId)
)

meeting_documents (
  meetingId uuid FK → meetings(id) ON DELETE CASCADE,
  documentId uuid FK → documents(id) ON DELETE CASCADE,
  PRIMARY KEY (meetingId, documentId)
)

meeting_proposals (
  meetingId uuid FK → meetings(id) ON DELETE CASCADE,
  proposalId uuid FK → proposals(id) ON DELETE CASCADE,
  PRIMARY KEY (meetingId, proposalId)
)
```

No changes to `meeting_decisions` — it already has the right shape.

## Auto-linking

Existing behaviour stays: `recordMeetingDecision` and `recordMeetingAction` (in `meeting-live-actions.ts`) continue to auto-link during live meetings.

Enhancement: `recordMeetingAction` should also insert into `meeting_actions` when creating an action during a live meeting.

Future: Transcript import will use the same linking tables to stage extracted items.

## Server Actions

In a new file `src/lib/meeting-link-actions.ts`:

- `linkToMeeting(meetingId, entityType, entityId)` — insert into the appropriate join table
- `unlinkFromMeeting(meetingId, entityType, entityId)` — delete from the appropriate join table

Both validate that the meeting and entity belong to the same space.

## Queries

Extend `getMeetingById` to include linked actions, documents, and proposals (it already includes decisions).

New backlink queries in `queries.ts`:
- `getActionMeetings(actionId)` — meetings linked to an action
- `getDocumentMeetings(documentId)` — meetings linked to a document
- `getProposalMeetings(proposalId)` — meetings linked to a proposal
- `getDecisionMeetings(decisionId)` — already exists

## UI: Meeting Detail Page

Below the existing "Decisions made" section, add sections for linked actions, documents, and proposals. All four sections (including decisions) get:

- List of linked items with relevant metadata (status, title, etc.)
- Each item links to its detail page
- Remove/unlink button per item
- "Link [entity type]" button that opens a search/select popover

The sidebar summary stats should include counts for all four linked types.

## UI: Entity Detail Pages

On each entity's detail page (decision, action, document, proposal), add a "Meetings" section:

- List of linked meetings with date and title
- Each links to the meeting detail page
- "Link to meeting" button with meeting search/select
- Unlink button per meeting

### Decision detail (`/decisions/[number]`)
Already shows linked meetings (via `getDecisionMeetings`). Add link/unlink controls.

### Action detail (inline on `/actions` page)
Actions are currently displayed in a list. Add a "Meeting" field showing linked meeting(s) if any.

### Document detail (`/documents/[id]`)
Add a "Meetings" section in the sidebar.

### Proposal detail (`/proposals/[id]`)
Add a "Meetings" section in the sidebar.

## Not in scope

- Transcript import / AI extraction (follow-up feature)
- Changes to the live meeting facilitation flow
- Bulk linking operations
