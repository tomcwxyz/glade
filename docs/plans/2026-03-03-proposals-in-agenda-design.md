# Proposals in Meeting Agendas — Design

## Goal

Allow proposals to flow naturally through the meeting process: added to agendas from both sides (meeting form and proposal page), surfaced with full context during live meetings, taken through a decision flow, and automatically linked back to the resulting decision.

## Current State

- `meetingAgendaItems.proposalId` FK already exists in schema
- Meeting form has an "Add proposal" picker, but it's hidden when no proposals have status `open_for_discussion` or `ready_for_decision`, and the button is easy to miss
- Proposal detail page has `MeetingLinks` for reference linking, but no "add to agenda" action
- Live meeting strips `proposalId` when mapping agenda items — proposal context is lost
- `beginDecisionFlow` accepts `proposalText` but the UI never passes it
- `recordMeetingDecision` doesn't update the proposal's `decidedAsDecisionId` or status

## Design

### 1. Meeting Form — Improve Proposal Picker

**Include draft proposals** in the picker alongside `open_for_discussion` and `ready_for_decision`. A draft might be agendaed for discussion before being formally opened.

**Show empty state** when there are no proposals at all: a disabled hint "No proposals available" so the button isn't silently absent.

**Better visibility**: match the "Add item" button styling so "Add proposal" is equally discoverable.

### 2. Proposal Detail Page — "Add to Meeting Agenda"

Add an "Add to meeting agenda" button on the proposal detail page:
- Shows a dropdown of upcoming meetings (status `draft` or `scheduled`)
- When selected, creates a new `meetingAgendaItems` row with `proposalId`, `type: "for_decision"`, and `title` from the proposal
- This is a server action, not a client-side form manipulation
- Separate from the existing `MeetingLinks` component (which links for reference tracking)

### 3. Live Meeting — Surface Proposal Context

**Pass proposal data to the live view.** In `live/page.tsx`, include `proposalId` and fetch the proposal's `description`, `rationale`, and `suggestedMethod` when mapping agenda items.

**Auto-start decision flow** when the facilitator advances to a proposal-backed agenda item (`type: "for_decision"` + `proposalId`):
- Call `beginDecisionFlow` with the proposal's `suggestedMethod` (or default to `consent`) and `proposalText` set to the proposal title + description
- Facilitator can still override the method or go back

### 4. Decision Recording — Close the Loop

When `recordMeetingDecision` creates a decision from an agenda item that has a `proposalId`:
- Set `proposals.decidedAsDecisionId` to the new decision ID
- Set `proposals.status` to `"decided"`
- This happens automatically, no extra UI needed

### What We're NOT Building

- No new pages or route changes
- No changes to the decision flow components (they already display `proposalText`)
- No changes to the proposal schema (all needed columns exist)
