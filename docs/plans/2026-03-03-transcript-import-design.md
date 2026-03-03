# Meeting Transcript Import — Design

> Date: 2026-03-03

## Goal

Import meeting transcriptions (Otter, Google Meet, handwritten notes) or notes into Glade, then use AI to extract draft decisions, actions, and topics. The user reviews and edits the extractions before anything is saved.

## Input

- **Paste text** into a textarea (primary)
- **File upload** accepting `.txt`, `.md`, `.docx`
- `.docx` parsed client-side with `mammoth.js`; `.txt`/`.md` read via `FileReader`
- File contents populate the textarea — all processing works from the text

## Entry Points

1. **New meeting from transcript** — "Import transcript" button on meetings list page → `/meetings/import`
2. **Import into existing meeting** — "Import transcript" button on meeting detail page → `/meetings/[id]/import`

Both share the same `TranscriptImport` client component.

## Data Model

One schema change — add `transcript` text column (nullable) to the `meetings` table. No new tables. The AI preview state lives in React state until the user confirms.

## AI Extraction

**Single-pass approach.** One AI call extracts all entity types at once.

New prompt: `transcriptExtractionPrompt(transcript, meetingContext?)` in `ai-prompts.ts`.

Returns structured JSON:

```json
{
  "decisions": [
    { "title": "...", "description": "...", "method": "consent|majority_vote|...", "outcome": "..." }
  ],
  "actions": [
    { "description": "...", "ownerName": "...", "dueDate": "YYYY-MM-DD|null" }
  ],
  "topics": [
    { "title": "...", "description": "...", "type": "question|tension|agenda_suggestion" }
  ],
  "summary": "2-3 sentence meeting summary"
}
```

New server action: `extractFromTranscript(transcript, meetingId?)` in `ai-actions.ts`. Checks AI enabled, calls `generateText`, parses JSON, returns result. No database writes.

Prompt design:
- Includes the space's valid decision methods so Claude picks from real enums
- If importing into an existing meeting, includes meeting context (title, date, attendees)
- Instructs Claude to be conservative — only extract clear decisions/actions/topics
- Max tokens: 4096

## User Flow (3 stages)

### Stage 1: Input
- Textarea for paste + file drop zone / picker
- For new meeting mode: title, date, type fields
- "Extract" button calls the AI server action with loading state

### Stage 2: Preview & Edit
- Three collapsible sections: Decisions, Actions, Topics
- Each item is an editable card with inline editing
- User can remove items (X) or add new ones (+)
- AI summary shown at top, editable, with "Save as meeting notes" checkbox
- "Confirm & save" button

### Stage 3: Confirm & Save
- Single server action creates all entities:
  - New meeting mode: creates meeting record → saves transcript → creates entities → links via join tables
  - Existing meeting mode: saves transcript to meeting → creates entities → links them
- Redirects to meeting detail page

## Component Architecture

| File | Type | Purpose |
|------|------|---------|
| `src/app/(app)/meetings/import/page.tsx` | Server | New meeting from transcript |
| `src/app/(app)/meetings/[id]/import/page.tsx` | Server | Import into existing meeting |
| `src/components/transcript-import.tsx` | Client | Shared 3-stage flow |
| `src/lib/ai-prompts.ts` | Modify | Add `transcriptExtractionPrompt` |
| `src/lib/ai-actions.ts` | Modify | Add `extractFromTranscript` |
| `src/lib/meeting-actions.ts` | Modify | Add `importTranscript` server action |
| `src/db/schema.ts` | Modify | Add `transcript` column |

## Dependencies

- **New:** `mammoth` (npm) — client-side .docx text extraction
- **Existing:** `@anthropic-ai/sdk`, Drizzle ORM, Next.js server actions

## Billing

Requires AI enabled (per-space toggle) + Canopy plan. Import buttons don't render if AI is unavailable.

## Decisions

| Decision | Rationale |
|----------|-----------|
| Single-pass AI extraction | Cheapest, fastest, AI sees full context across entity types |
| Client-side file parsing | No server file storage needed, mammoth handles .docx well |
| Preview-then-confirm | Nothing saved until user approves — safest for AI-generated content |
| Dedicated transcript field | Keeps hand-written notes separate from imported transcripts |
| No draft extraction storage | Preview lives in React state; YAGNI until we need resume |
