# Proposals in Meeting Agendas — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow proposals to flow through live meetings — added to agendas from both sides, auto-starting decision flows, and auto-linking back to decisions when recorded.

**Architecture:** Wire existing schema fields (`meetingAgendaItems.proposalId`, `proposals.decidedAsDecisionId`, `DecisionFlow.proposalText`) that are already in place but unused by the UI. Add a server action for adding proposals to agendas from the proposal page. Pass proposal data through the live meeting pipeline so decision flows are pre-populated.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, Server Actions, TypeScript

---

### Task 1: Improve Meeting Form Proposal Picker

The "Add proposal" button in the meeting form is hidden when no proposals have status `open_for_discussion` or `ready_for_decision`. Include `draft` proposals too, and show an empty state hint.

**Files:**
- Modify: `src/app/(app)/meetings/new/page.tsx:16-18`
- Modify: `src/app/(app)/meetings/[id]/edit/page.tsx:25-27`
- Modify: `src/app/(app)/meetings/meeting-form.tsx:109-111, 371-408`

**Step 1: Include draft proposals in the filter**

In `src/app/(app)/meetings/new/page.tsx`, change line 17 from:
```typescript
.filter((p) => p.status === "open_for_discussion" || p.status === "ready_for_decision")
```
to:
```typescript
.filter((p) => p.status === "draft" || p.status === "open_for_discussion" || p.status === "ready_for_decision")
```

Apply the same change to `src/app/(app)/meetings/[id]/edit/page.tsx` line 26.

**Step 2: Update the meeting form filter to match**

In `src/app/(app)/meetings/meeting-form.tsx`, change lines 109-111 from:
```typescript
const availableProposals = (proposals || []).filter(
  (p) => p.status === "open_for_discussion" || p.status === "ready_for_decision"
);
```
to:
```typescript
const availableProposals = (proposals || []).filter(
  (p) => p.status === "draft" || p.status === "open_for_discussion" || p.status === "ready_for_decision"
);
```

**Step 3: Always show the "Add proposal" button, with empty state**

In `src/app/(app)/meetings/meeting-form.tsx`, change the conditional at line 371 from:
```typescript
{availableProposals.length > 0 && (
  <div className="relative">
    <button ...>Add proposal</button>
    ...
  </div>
)}
```
to always render the button, but show a disabled state or hint when no proposals are available:
```typescript
<div className="relative">
  <button
    type="button"
    onClick={() => {
      if (availableProposals.length === 0) return;
      setShowProposalPicker(!showProposalPicker);
      setShowTopicPicker(false);
    }}
    disabled={availableProposals.length === 0}
    className={`flex items-center gap-1 text-xs transition-colors ${
      availableProposals.length === 0
        ? "text-bark-muted/50 cursor-not-allowed"
        : "text-canopy hover:text-canopy-light"
    }`}
  >
    <FileText size={14} />
    Add proposal
  </button>
  {showProposalPicker && availableProposals.length > 0 && (
    <div className="absolute right-0 top-full mt-1 w-72 bg-paper border border-border rounded-lg shadow-lg z-10 py-1 max-h-60 overflow-y-auto">
      {availableProposals.map((proposal) => (
        <button
          key={proposal.id}
          type="button"
          onClick={() => {
            addProposalAsAgendaItem(proposal);
            setShowProposalPicker(false);
          }}
          className="w-full text-left px-3 py-2 hover:bg-paper-warm transition-colors"
        >
          <span className="text-sm text-bark block truncate">
            {proposal.title}
          </span>
          <span className="text-xs text-bark-muted">
            {proposal.status === "ready_for_decision"
              ? "Ready for decision"
              : proposal.status === "open_for_discussion"
              ? "Open for discussion"
              : "Draft"}
          </span>
        </button>
      ))}
    </div>
  )}
</div>
```

**Step 4: Verify**

Run: `npm run build`
Expected: Clean build, no errors.

**Step 5: Commit**

```bash
git add "src/app/(app)/meetings/new/page.tsx" "src/app/(app)/meetings/[id]/edit/page.tsx" "src/app/(app)/meetings/meeting-form.tsx"
git commit -m "feat: improve meeting form proposal picker visibility and include drafts"
```

---

### Task 2: Add "Add to Meeting Agenda" Server Action

Create a server action that inserts a proposal as an agenda item on a specified meeting.

**Files:**
- Modify: `src/lib/meeting-actions.ts` (add new action at end of file)

**Step 1: Add the server action**

Add to the end of `src/lib/meeting-actions.ts`:

```typescript
export async function addProposalToAgenda(proposalId: string, meetingId: string) {
  await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  // Verify meeting belongs to space
  const [meeting] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)))
    .limit(1);
  if (!meeting) return { error: "Meeting not found" };

  // Get proposal title
  const [proposal] = await db
    .select({ id: proposals.id, title: proposals.title })
    .from(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.spaceId, space.id)))
    .limit(1);
  if (!proposal) return { error: "Proposal not found" };

  // Check not already on agenda
  const [existing] = await db
    .select({ id: meetingAgendaItems.id })
    .from(meetingAgendaItems)
    .where(
      and(
        eq(meetingAgendaItems.meetingId, meetingId),
        eq(meetingAgendaItems.proposalId, proposalId)
      )
    )
    .limit(1);
  if (existing) return { error: "Proposal is already on this meeting's agenda" };

  // Get current max sort order
  const agendaRows = await db
    .select({ sortOrder: meetingAgendaItems.sortOrder })
    .from(meetingAgendaItems)
    .where(eq(meetingAgendaItems.meetingId, meetingId));
  const maxSort = agendaRows.length > 0 ? Math.max(...agendaRows.map((r) => r.sortOrder)) : -1;

  await db.insert(meetingAgendaItems).values({
    meetingId,
    title: proposal.title,
    type: "for_decision",
    sortOrder: maxSort + 1,
    proposalId: proposal.id,
  });

  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath(`/proposals/${proposalId}`);
  return { success: true };
}
```

Note: The `proposals` import is already present in this file.

**Step 2: Verify**

Run: `npm run build`
Expected: Clean build.

**Step 3: Commit**

```bash
git add src/lib/meeting-actions.ts
git commit -m "feat: add addProposalToAgenda server action"
```

---

### Task 3: Add "Add to Meeting Agenda" UI on Proposal Detail Page

Add a client component that lets users pick a meeting and add the proposal as an agenda item.

**Files:**
- Create: `src/app/(app)/proposals/[id]/add-to-agenda.tsx`
- Modify: `src/app/(app)/proposals/[id]/page.tsx`

**Step 1: Create the AddToAgenda component**

Create `src/app/(app)/proposals/[id]/add-to-agenda.tsx`:

```typescript
"use client";

import { useState } from "react";
import { CalendarPlus, Check, Loader2 } from "lucide-react";
import { addProposalToAgenda } from "@/lib/meeting-actions";

interface Meeting {
  id: string;
  title: string;
  date: string;
}

export function AddToAgenda({
  proposalId,
  meetings,
}: {
  proposalId: string;
  meetings: Meeting[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(meetingId: string) {
    setLoading(true);
    setError(null);
    const result = await addProposalToAgenda(proposalId, meetingId);
    setLoading(false);
    if (result && "error" in result) {
      setError(result.error);
    } else {
      setDone(meetingId);
      setTimeout(() => {
        setDone(null);
        setOpen(false);
      }, 1500);
    }
  }

  if (meetings.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm bg-paper-deep border border-border rounded-lg text-bark-muted hover:text-bark hover:bg-paper-warm transition-colors"
      >
        <CalendarPlus size={14} />
        Add to agenda
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-paper border border-border rounded-lg shadow-lg z-10 py-1 max-h-60 overflow-y-auto">
          <div className="px-3 py-1.5 text-xs text-bark-muted font-medium border-b border-border">
            Choose a meeting
          </div>
          {meetings.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleAdd(m.id)}
              disabled={loading || done === m.id}
              className="w-full text-left px-3 py-2 hover:bg-paper-warm transition-colors disabled:opacity-50 flex items-center justify-between"
            >
              <div>
                <span className="text-sm text-bark block truncate">{m.title}</span>
                <span className="text-xs text-bark-muted">
                  {new Date(m.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              {done === m.id && <Check size={14} className="text-canopy shrink-0" />}
              {loading && done !== m.id && <Loader2 size={14} className="animate-spin text-bark-muted shrink-0" />}
            </button>
          ))}
          {error && (
            <p className="px-3 py-2 text-xs text-earth">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Add the component to the proposal detail page**

In `src/app/(app)/proposals/[id]/page.tsx`:

Add import at the top:
```typescript
import { AddToAgenda } from "./add-to-agenda";
```

Filter meetings for the picker — after the existing `Promise.all` (around line 44), add:
```typescript
const upcomingMeetings = allMeetings
  .filter((m) => m.status === "draft" || m.status === "scheduled" || m.status === "in_progress")
  .map((m) => ({ id: m.id, title: m.title, date: m.date.toISOString() }));
```

Note: `getMeetingsList` currently only returns `id`, `title`, `date` — no `status`. We need to update the query or use a different approach. See Step 3.

Add the component in the header actions area (after the Edit link, around line 117):
```typescript
<AddToAgenda proposalId={proposal.id} meetings={upcomingMeetings} />
```

**Step 3: Update getMeetingsList to include status**

In `src/lib/queries.ts`, update `getMeetingsList` (line 502) to also select `status`:

```typescript
export async function getMeetingsList(spaceId: string) {
  return db
    .select({
      id: meetings.id,
      title: meetings.title,
      date: meetings.date,
      status: meetings.status,
    })
    .from(meetings)
    .where(eq(meetings.spaceId, spaceId))
    .orderBy(desc(meetings.date));
}
```

**Step 4: Verify**

Run: `npm run build`
Expected: Clean build.

**Step 5: Commit**

```bash
git add "src/app/(app)/proposals/[id]/add-to-agenda.tsx" "src/app/(app)/proposals/[id]/page.tsx" src/lib/queries.ts
git commit -m "feat: add 'Add to agenda' button on proposal detail page"
```

---

### Task 4: Pass Proposal Data Through to Live Meeting

The live meeting page strips `proposalId` when mapping agenda items. Include it and fetch proposal details.

**Files:**
- Modify: `src/app/(app)/meetings/[id]/live/page.tsx:31-37`
- Modify: `src/app/(app)/meetings/[id]/live/facilitator-view.tsx:40-46`
- Modify: `src/app/(app)/meetings/[id]/live/participant-view.tsx` (same AgendaItem interface)

**Step 1: Update the live page to include proposal data**

In `src/app/(app)/meetings/[id]/live/page.tsx`, update the `agendaItems` mapping (lines 31-37):

```typescript
const agendaItems = meeting.agendaItems.map((item) => ({
  id: item.id,
  title: item.title,
  description: item.description,
  type: item.type,
  durationMinutes: item.durationMinutes,
  proposalId: item.proposalId || null,
}));
```

We also need proposal details (description, rationale, suggestedMethod) for items that have a proposalId. Add a query after the agendaItems mapping:

```typescript
// Fetch proposal details for proposal-backed agenda items
const proposalIds = agendaItems
  .map((a) => a.proposalId)
  .filter((id): id is string => id !== null);

let proposalMap: Record<string, { description: string | null; rationale: string | null; suggestedMethod: string | null }> = {};
if (proposalIds.length > 0) {
  const { proposals } = await import("@/db/schema");
  const { inArray } = await import("drizzle-orm");
  const proposalRows = await db
    .select({
      id: proposals.id,
      description: proposals.description,
      rationale: proposals.rationale,
      suggestedMethod: proposals.suggestedMethod,
    })
    .from(proposals)
    .where(inArray(proposals.id, proposalIds));
  proposalMap = Object.fromEntries(proposalRows.map((p) => [p.id, p]));
}

const agendaWithProposals = agendaItems.map((item) => ({
  ...item,
  proposal: item.proposalId ? proposalMap[item.proposalId] || null : null,
}));
```

Pass `agendaWithProposals` instead of `agendaItems` to both `FacilitatorView` and `ParticipantView`.

**Step 2: Update AgendaItem interface in facilitator-view.tsx**

In `src/app/(app)/meetings/[id]/live/facilitator-view.tsx`, update the interface (lines 40-46):

```typescript
interface AgendaItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  durationMinutes: number | null;
  proposalId: string | null;
  proposal: {
    description: string | null;
    rationale: string | null;
    suggestedMethod: string | null;
  } | null;
}
```

Update the same interface in `participant-view.tsx`.

**Step 3: Verify**

Run: `npm run build`
Expected: Clean build.

**Step 4: Commit**

```bash
git add "src/app/(app)/meetings/[id]/live/page.tsx" "src/app/(app)/meetings/[id]/live/facilitator-view.tsx" "src/app/(app)/meetings/[id]/live/participant-view.tsx"
git commit -m "feat: pass proposal data through to live meeting views"
```

---

### Task 5: Auto-Start Decision Flow for Proposal-Backed Agenda Items

When the facilitator advances to an agenda item with a proposal, automatically start the decision flow.

**Files:**
- Modify: `src/app/(app)/meetings/[id]/live/facilitator-view.tsx`

**Step 1: Auto-start decision flow on agenda item change**

In `facilitator-view.tsx`, add a `useEffect` that triggers when the current agenda item changes. If the new item has a `proposalId` and we're not already in a decision flow, start one automatically.

After the existing `useEffect` for announcing agenda items (around line 130), add:

```typescript
// Auto-start decision flow for proposal-backed agenda items
const currentProposal = currentItem?.proposal;
const currentProposalId = currentItem?.proposalId;
const isInDecisionFlow = state?.phase === "decision_flow";

useEffect(() => {
  if (!currentProposalId || !currentProposal || !currentItem || isInDecisionFlow) return;
  if (currentItem.type !== "for_decision") return;

  // Build proposal text for the flow
  const proposalText = [currentItem.title, currentProposal.description]
    .filter(Boolean)
    .join("\n\n");
  const method = currentProposal.suggestedMethod || "consent";

  beginDecisionFlow(meetingId, method, proposalText).then((result) => {
    if ("state" in result && result.state) mutate(result.state);
  });
}, [currentProposalId]); // eslint-disable-line react-hooks/exhaustive-deps
```

Note: The dependency array is intentionally narrow — we only want this to fire when the agenda item changes (identified by `currentProposalId`), not on every render.

**Step 2: Show proposal rationale in the current item display**

In the current item header section (around line 287), after the description display, add:

```typescript
{currentItem.proposal?.rationale && (
  <div className="mt-3 p-3 bg-paper-warm rounded-lg border border-border">
    <p className="text-xs font-medium text-bark-muted mb-1">Rationale</p>
    <p className="text-sm text-bark-muted leading-relaxed">{currentItem.proposal.rationale}</p>
  </div>
)}
```

**Step 3: Verify**

Run: `npm run build`
Expected: Clean build.

**Step 4: Commit**

```bash
git add "src/app/(app)/meetings/[id]/live/facilitator-view.tsx"
git commit -m "feat: auto-start decision flow for proposal-backed agenda items"
```

---

### Task 6: Auto-Link Proposal to Decision on Recording

When a decision is recorded during a live meeting, if the current agenda item has a `proposalId`, update the proposal.

**Files:**
- Modify: `src/lib/meeting-live-actions.ts:266-298`
- Modify: `src/app/(app)/meetings/[id]/live/decision-flow-container.tsx`
- Modify: `src/app/(app)/meetings/[id]/live/facilitator-view.tsx`

**Step 1: Update recordMeetingDecision to accept proposalId**

In `src/lib/meeting-live-actions.ts`, add `proposals` to the imports:

```typescript
import {
  meetings,
  decisions,
  meetingDecisions,
  meetingActions,
  actions,
  meetingAgendaItems,
  proposals,
} from "@/db/schema";
```

Update the `recordMeetingDecision` function signature (line 266):

```typescript
export async function recordMeetingDecision(
  meetingId: string,
  title: string,
  method: string,
  outcome?: string,
  proposalId?: string
)
```

After the `meetingDecisions` insert (around line 292), add:

```typescript
// If this decision came from a proposal, link and update the proposal
if (proposalId) {
  await db
    .update(proposals)
    .set({
      decidedAsDecisionId: decision.id,
      status: "decided",
      updatedAt: new Date(),
    })
    .where(eq(proposals.id, proposalId));
  revalidatePath("/proposals");
}
```

**Step 2: Pass proposalId through the call chain**

In `facilitator-view.tsx`, update `handleRecordDecision` to pass the current agenda item's `proposalId`:

```typescript
const handleRecordDecision = useCallback(
  async (title: string, method: string, outcome?: string) => {
    const currentProposalId = agendaItems[state?.currentAgendaItemIndex ?? 0]?.proposalId;
    const result = await recordMeetingDecision(meetingId, title, method, outcome, currentProposalId || undefined);
    if ("decisionId" in result) {
      const advResult = await advanceAgendaItem(meetingId, outcome, result.decisionId);
      if ("state" in advResult && advResult.state) mutate(advResult.state);
    }
  },
  [meetingId, mutate, agendaItems, state?.currentAgendaItemIndex]
);
```

In `decision-flow-container.tsx`, update `handleRecordAndAdvance` similarly — it needs to receive the `proposalId` from the parent. Update the component props to accept `agendaItems` and `currentAgendaItemIndex`:

Add to the component props:
```typescript
agendaItems?: { proposalId: string | null }[];
currentAgendaItemIndex?: number;
```

Update `handleRecordAndAdvance`:
```typescript
const handleRecordAndAdvance = useCallback(
  async (title: string, method: string, outcome?: string) => {
    const currentProposalId = agendaItems?.[currentAgendaItemIndex ?? 0]?.proposalId;
    const result = await recordMeetingDecision(meetingId, title, method, outcome, currentProposalId || undefined);
    if ("decisionId" in result) {
      const advResult = await advanceAgendaItem(meetingId, outcome, result.decisionId);
      if ("state" in advResult && advResult.state) mutate(advResult.state);
    }
  },
  [meetingId, mutate, agendaItems, currentAgendaItemIndex]
);
```

Update all `DecisionFlowContainer` usages in `facilitator-view.tsx` and `participant-view.tsx` to pass these new props:
```typescript
<DecisionFlowContainer
  meetingId={meetingId}
  state={state}
  mutate={mutate}
  isFacilitator
  voteThreshold={voteThreshold}
  agendaItems={agendaItems}
  currentAgendaItemIndex={state.currentAgendaItemIndex}
/>
```

**Step 3: Verify**

Run: `npm run build`
Expected: Clean build.

**Step 4: Commit**

```bash
git add src/lib/meeting-live-actions.ts "src/app/(app)/meetings/[id]/live/decision-flow-container.tsx" "src/app/(app)/meetings/[id]/live/facilitator-view.tsx" "src/app/(app)/meetings/[id]/live/participant-view.tsx"
git commit -m "feat: auto-link proposal to decision when recorded in live meeting"
```

---

### Task 7: Final Verification and Push

**Step 1: Full build**

Run: `npm run build`
Expected: Clean build with no errors.

**Step 2: Lint**

Run: `npm run lint`
Expected: No new warnings beyond pre-existing ones.

**Step 3: Push**

```bash
git push
```
