# Meeting-Entity Linking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add bidirectional linking between meetings and decisions, actions, documents, and proposals — with manual link/unlink UI on both sides.

**Architecture:** Three new join tables (`meeting_actions`, `meeting_documents`, `meeting_proposals`) matching the existing `meeting_decisions` pattern. A single server-action file handles link/unlink for all entity types. Each entity detail page and the meeting detail page get link/unlink UI. `recordMeetingAction` also auto-links actions during live meetings.

**Tech Stack:** Drizzle ORM (schema + queries), Next.js 15 server actions, React client components with `useTransition`.

---

### Task 1: Add join tables to Drizzle schema

**Files:**
- Modify: `src/db/schema.ts`

**Step 1: Add meetingActions table after meetingDecisions (around line 368)**

Add this immediately after the `meetingDecisions` table definition:

```typescript
export const meetingActions = pgTable(
  "meeting_actions",
  {
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    actionId: uuid("action_id")
      .notNull()
      .references(() => actions.id, { onDelete: "cascade" }),
  },
  (ma) => [primaryKey({ columns: [ma.meetingId, ma.actionId] })]
);

export const meetingDocuments = pgTable(
  "meeting_documents",
  {
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
  },
  (md) => [primaryKey({ columns: [md.meetingId, md.documentId] })]
);

export const meetingProposals = pgTable(
  "meeting_proposals",
  {
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
  },
  (mp) => [primaryKey({ columns: [mp.meetingId, mp.proposalId] })]
);
```

**Step 2: Add relations for the new join tables**

Add near the existing `meetingDecisionsRelations` (around line 733):

```typescript
export const meetingActionsRelations = relations(meetingActions, ({ one }) => ({
  meeting: one(meetings, { fields: [meetingActions.meetingId], references: [meetings.id] }),
  action: one(actions, { fields: [meetingActions.actionId], references: [actions.id] }),
}));

export const meetingDocumentsRelations = relations(meetingDocuments, ({ one }) => ({
  meeting: one(meetings, { fields: [meetingDocuments.meetingId], references: [meetings.id] }),
  document: one(documents, { fields: [meetingDocuments.documentId], references: [documents.id] }),
}));

export const meetingProposalsRelations = relations(meetingProposals, ({ one }) => ({
  meeting: one(meetings, { fields: [meetingProposals.meetingId], references: [meetings.id] }),
  proposal: one(proposals, { fields: [meetingProposals.proposalId], references: [proposals.id] }),
}));
```

**Step 3: Update meetingsRelations to include the new join tables**

In `meetingsRelations` (line ~714), add three new `many()` entries:

```typescript
export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  space: one(spaces, { fields: [meetings.spaceId], references: [spaces.id] }),
  createdByUser: one(users, { fields: [meetings.createdBy], references: [users.id] }),
  attendees: many(meetingAttendees),
  agendaItems: many(meetingAgendaItems),
  decisions: many(meetingDecisions),
  actions: many(meetingActions),
  documents: many(meetingDocuments),
  proposals: many(meetingProposals),
}));
```

**Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "schema: add meeting_actions, meeting_documents, meeting_proposals join tables"
```

---

### Task 2: Apply schema to database

**Files:**
- Create (temp): `run-migration.cjs`

**Step 1: Write migration script**

```javascript
const { neon } = require("@neondatabase/serverless");
const fs = require("fs");
const path = require("path");

const env = fs.readFileSync(path.join(__dirname, ".env.local"), "utf8");
const DATABASE_URL = env.match(/DATABASE_URL=(.+)/)?.[1];
if (!DATABASE_URL) throw new Error("No DATABASE_URL in .env.local");

const sql = neon(DATABASE_URL);

async function migrate() {
  await sql`CREATE TABLE IF NOT EXISTS meeting_actions (
    meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    action_id uuid NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    PRIMARY KEY (meeting_id, action_id)
  )`;
  console.log("Created meeting_actions");

  await sql`CREATE TABLE IF NOT EXISTS meeting_documents (
    meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    PRIMARY KEY (meeting_id, document_id)
  )`;
  console.log("Created meeting_documents");

  await sql`CREATE TABLE IF NOT EXISTS meeting_proposals (
    meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    PRIMARY KEY (meeting_id, proposal_id)
  )`;
  console.log("Created meeting_proposals");
}

migrate().then(() => console.log("Done")).catch(console.error);
```

**Step 2: Run migration**

Run: `node run-migration.cjs`
Expected: "Created meeting_actions", "Created meeting_documents", "Created meeting_proposals", "Done"

**Step 3: Delete migration script and commit**

```bash
rm run-migration.cjs
git add -A
git commit -m "schema: apply meeting entity join tables to database"
```

---

### Task 3: Add queries for meeting-entity links

**Files:**
- Modify: `src/lib/queries.ts`

**Step 1: Extend getMeetingById to include actions, documents, proposals**

In `getMeetingById` (line ~300), after the existing `decisionRows` query (around line 330), add three more queries:

```typescript
const actionRows = await db
  .select({
    id: actions.id,
    description: actions.description,
    status: actions.status,
    ownerName: actions.ownerName,
    dueDate: actions.dueDate,
  })
  .from(meetingActions)
  .innerJoin(actions, eq(actions.id, meetingActions.actionId))
  .where(eq(meetingActions.meetingId, m.id));

const documentRows = await db
  .select({
    id: documents.id,
    title: documents.title,
    type: documents.type,
    status: documents.status,
  })
  .from(meetingDocuments)
  .innerJoin(documents, eq(documents.id, meetingDocuments.documentId))
  .where(eq(meetingDocuments.meetingId, m.id));

const proposalRows = await db
  .select({
    id: proposals.id,
    title: proposals.title,
    status: proposals.status,
  })
  .from(meetingProposals)
  .innerJoin(proposals, eq(proposals.id, meetingProposals.proposalId))
  .where(eq(meetingProposals.meetingId, m.id));
```

Update the return to include them:

```typescript
return {
  ...m,
  attendees: attendeeRows,
  agendaItems: agendaRows,
  decisions: decisionRows,
  actions: actionRows,
  documents: documentRows,
  proposals: proposalRows,
};
```

Add imports for `meetingActions`, `meetingDocuments`, `meetingProposals` from schema at the top of the file.

**Step 2: Add backlink queries**

After `getDecisionMeetings` (line ~520), add:

```typescript
export async function getActionMeetings(actionId: string) {
  return db
    .select({
      meetingId: meetings.id,
      title: meetings.title,
      date: meetings.date,
    })
    .from(meetingActions)
    .innerJoin(meetings, eq(meetings.id, meetingActions.meetingId))
    .where(eq(meetingActions.actionId, actionId));
}

export async function getDocumentMeetings(documentId: string) {
  return db
    .select({
      meetingId: meetings.id,
      title: meetings.title,
      date: meetings.date,
    })
    .from(meetingDocuments)
    .innerJoin(meetings, eq(meetings.id, meetingDocuments.meetingId))
    .where(eq(meetingDocuments.documentId, documentId));
}

export async function getProposalMeetings(proposalId: string) {
  return db
    .select({
      meetingId: meetings.id,
      title: meetings.title,
      date: meetings.date,
    })
    .from(meetingProposals)
    .innerJoin(meetings, eq(meetings.id, meetingProposals.meetingId))
    .where(eq(meetingProposals.proposalId, proposalId));
}
```

**Step 3: Commit**

```bash
git add src/lib/queries.ts
git commit -m "feat: add queries for meeting-entity links"
```

---

### Task 4: Create meeting link/unlink server actions

**Files:**
- Create: `src/lib/meeting-link-actions.ts`

**Step 1: Create the server actions file**

```typescript
"use server";

import { db } from "@/db";
import { meetings, actions, documents, proposals, meetingDecisions, meetingActions, meetingDocuments, meetingProposals } from "@/db/schema";
import { getCurrentSpace } from "@/lib/space";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type EntityType = "decision" | "action" | "document" | "proposal";

const entityConfig = {
  decision: {
    table: meetingDecisions,
    entityCol: meetingDecisions.decisionId,
    meetingCol: meetingDecisions.meetingId,
    sourceTable: proposals, // unused placeholder — decisions validated separately
    sourceIdCol: proposals.id, // unused
    revalidate: ["/decisions"],
  },
  action: {
    table: meetingActions,
    entityCol: meetingActions.actionId,
    meetingCol: meetingActions.meetingId,
    sourceTable: actions,
    sourceIdCol: actions.id,
    revalidate: ["/actions"],
  },
  document: {
    table: meetingDocuments,
    entityCol: meetingDocuments.documentId,
    meetingCol: meetingDocuments.meetingId,
    sourceTable: documents,
    sourceIdCol: documents.id,
    revalidate: ["/documents"],
  },
  proposal: {
    table: meetingProposals,
    entityCol: meetingProposals.proposalId,
    meetingCol: meetingProposals.meetingId,
    sourceTable: proposals,
    sourceIdCol: proposals.id,
    revalidate: ["/proposals"],
  },
} as const;

export async function linkToMeeting(
  meetingId: string,
  entityType: EntityType,
  entityId: string
) {
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  // Verify meeting belongs to space
  const [meeting] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)))
    .limit(1);
  if (!meeting) return { error: "Meeting not found" };

  const config = entityConfig[entityType];

  // Check if already linked
  const [existing] = await db
    .select({ meetingId: config.meetingCol })
    .from(config.table)
    .where(and(eq(config.entityCol, entityId), eq(config.meetingCol, meetingId)));
  if (existing) return { error: "Already linked" };

  // Insert link
  const values: Record<string, string> = {
    meetingId,
  };
  if (entityType === "decision") values.decisionId = entityId;
  else if (entityType === "action") values.actionId = entityId;
  else if (entityType === "document") values.documentId = entityId;
  else if (entityType === "proposal") values.proposalId = entityId;

  await db.insert(config.table).values(values as never);

  revalidatePath(`/meetings/${meetingId}`);
  for (const path of config.revalidate) revalidatePath(path);
}

export async function unlinkFromMeeting(
  meetingId: string,
  entityType: EntityType,
  entityId: string
) {
  const config = entityConfig[entityType];

  await db
    .delete(config.table)
    .where(and(eq(config.entityCol, entityId), eq(config.meetingCol, meetingId)));

  revalidatePath(`/meetings/${meetingId}`);
  for (const path of config.revalidate) revalidatePath(path);
}
```

**Step 2: Commit**

```bash
git add src/lib/meeting-link-actions.ts
git commit -m "feat: add linkToMeeting/unlinkFromMeeting server actions"
```

---

### Task 5: Auto-link actions during live meetings

**Files:**
- Modify: `src/lib/meeting-live-actions.ts`

**Step 1: Import meetingActions**

At the top of the file, add `meetingActions` to the schema import.

**Step 2: Insert into meetingActions in recordMeetingAction**

In `recordMeetingAction` (line ~299), after the `db.insert(actions).values(...)` call, add:

```typescript
const [newAction] = await db.insert(actions).values({
  spaceId: space.id,
  decisionId,
  description,
  ownerName: ownerName || null,
  dueDate: dueDate ? new Date(dueDate) : null,
  status: "open",
}).returning({ id: actions.id });

await db.insert(meetingActions).values({
  meetingId,
  actionId: newAction.id,
});
```

This replaces the existing `db.insert(actions).values(...)` with one that uses `.returning()` to get the new action's ID, then links it.

**Step 3: Commit**

```bash
git add src/lib/meeting-live-actions.ts
git commit -m "feat: auto-link actions to meetings during live sessions"
```

---

### Task 6: Meeting detail page — show linked entities with link/unlink UI

**Files:**
- Modify: `src/app/(app)/meetings/[id]/page.tsx`
- Create: `src/app/(app)/meetings/[id]/meeting-links-editor.tsx`

**Step 1: Create the MeetingLinksEditor client component**

This component handles all four entity types. It follows the same pattern as `decision-links-editor.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckSquare,
  CircleDot,
  FileText,
  Lightbulb,
  Plus,
  X,
} from "lucide-react";
import { linkToMeeting, unlinkFromMeeting } from "@/lib/meeting-link-actions";
import { formatDate } from "@/lib/utils";

type LinkedDecision = {
  id: string;
  number: number;
  title: string;
  status: string;
};
type LinkedAction = {
  id: string;
  description: string;
  status: string;
  ownerName: string | null;
};
type LinkedDocument = {
  id: string;
  title: string;
  type: string;
  status: string;
};
type LinkedProposal = {
  id: string;
  title: string;
  status: string;
};

type AllDecision = { id: string; number: number; title: string };
type AllAction = { id: string; description: string };
type AllDocument = { id: string; title: string };
type AllProposal = { id: string; title: string };

export function MeetingLinksEditor({
  meetingId,
  decisions,
  actions,
  documents,
  proposals,
  allDecisions,
  allActions,
  allDocuments,
  allProposals,
}: {
  meetingId: string;
  decisions: LinkedDecision[];
  actions: LinkedAction[];
  documents: LinkedDocument[];
  proposals: LinkedProposal[];
  allDecisions: AllDecision[];
  allActions: AllAction[];
  allDocuments: AllDocument[];
  allProposals: AllProposal[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState<
    "decision" | "action" | "document" | "proposal" | null
  >(null);
  const [target, setTarget] = useState("");

  const selectClass =
    "w-full text-sm border border-border rounded-lg px-3 py-2 bg-paper text-bark focus:outline-none focus:ring-2 focus:ring-canopy/20";

  const availableDecisions = allDecisions.filter(
    (d) => !decisions.some((ld) => ld.id === d.id)
  );
  const availableActions = allActions.filter(
    (a) => !actions.some((la) => la.id === a.id)
  );
  const availableDocuments = allDocuments.filter(
    (d) => !documents.some((ld) => ld.id === d.id)
  );
  const availableProposals = allProposals.filter(
    (p) => !proposals.some((lp) => lp.id === p.id)
  );

  function handleAdd(entityType: "decision" | "action" | "document" | "proposal") {
    if (!target) return;
    startTransition(async () => {
      await linkToMeeting(meetingId, entityType, target);
      setShowForm(null);
      setTarget("");
      router.refresh();
    });
  }

  function handleRemove(
    entityType: "decision" | "action" | "document" | "proposal",
    entityId: string
  ) {
    startTransition(async () => {
      await unlinkFromMeeting(meetingId, entityType, entityId);
      router.refresh();
    });
  }

  function renderForm(
    entityType: "decision" | "action" | "document" | "proposal",
    options: { id: string; label: string }[],
    placeholder: string
  ) {
    if (showForm !== entityType) return null;
    return (
      <div className="mb-4 p-3 bg-paper-warm rounded-lg border border-border space-y-2">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className={selectClass}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleAdd(entityType)}
            disabled={!target || isPending}
            className="px-3 py-1.5 text-xs font-medium text-paper bg-canopy rounded-lg hover:bg-canopy-light transition-colors disabled:opacity-50"
          >
            Link
          </button>
          <button
            type="button"
            onClick={() => { setShowForm(null); setTarget(""); }}
            className="px-3 py-1.5 text-xs text-bark-muted hover:text-bark transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Render sections — see the full JSX below
  return (
    <div className="space-y-8">
      {/* Decisions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2">
            <CircleDot size={13} />
            Decisions ({decisions.length})
          </h2>
          {availableDecisions.length > 0 && (
            <button
              type="button"
              onClick={() => { setShowForm("decision"); setTarget(""); }}
              className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
            >
              <Plus size={13} />
              Link decision
            </button>
          )}
        </div>
        {renderForm(
          "decision",
          availableDecisions.map((d) => ({ id: d.id, label: `#${d.number} ${d.title}` })),
          "Select a decision..."
        )}
        {decisions.length === 0 && showForm !== "decision" && (
          <p className="text-sm text-bark-muted/60">No linked decisions.</p>
        )}
        <div className="space-y-1">
          {decisions.map((d) => (
            <div key={d.id} className="flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg group hover:bg-paper-warm transition-colors">
              <Link href={`/decisions/${d.number}`} className="flex-1 flex items-center gap-2 text-sm text-bark hover:text-canopy transition-colors min-w-0">
                <span className="text-xs text-bark-muted font-medium tabular-nums shrink-0">#{d.number}</span>
                <span className="truncate">{d.title}</span>
              </Link>
              <button type="button" onClick={() => handleRemove("decision", d.id)} className="opacity-0 group-hover:opacity-100 text-bark-muted hover:text-earth transition-all shrink-0" aria-label="Unlink decision">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Actions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2">
            <CheckSquare size={13} />
            Actions ({actions.length})
          </h2>
          {availableActions.length > 0 && (
            <button
              type="button"
              onClick={() => { setShowForm("action"); setTarget(""); }}
              className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
            >
              <Plus size={13} />
              Link action
            </button>
          )}
        </div>
        {renderForm(
          "action",
          availableActions.map((a) => ({ id: a.id, label: a.description })),
          "Select an action..."
        )}
        {actions.length === 0 && showForm !== "action" && (
          <p className="text-sm text-bark-muted/60">No linked actions.</p>
        )}
        <div className="space-y-1">
          {actions.map((a) => (
            <div key={a.id} className="flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg group hover:bg-paper-warm transition-colors">
              <Link href="/actions" className="flex-1 text-sm text-bark hover:text-canopy transition-colors min-w-0 truncate">
                {a.description}
              </Link>
              {a.ownerName && (
                <span className="text-xs text-bark-muted shrink-0">{a.ownerName}</span>
              )}
              <button type="button" onClick={() => handleRemove("action", a.id)} className="opacity-0 group-hover:opacity-100 text-bark-muted hover:text-earth transition-all shrink-0" aria-label="Unlink action">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Documents */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2">
            <FileText size={13} />
            Documents ({documents.length})
          </h2>
          {availableDocuments.length > 0 && (
            <button
              type="button"
              onClick={() => { setShowForm("document"); setTarget(""); }}
              className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
            >
              <Plus size={13} />
              Link document
            </button>
          )}
        </div>
        {renderForm(
          "document",
          availableDocuments.map((d) => ({ id: d.id, label: d.title })),
          "Select a document..."
        )}
        {documents.length === 0 && showForm !== "document" && (
          <p className="text-sm text-bark-muted/60">No linked documents.</p>
        )}
        <div className="space-y-1">
          {documents.map((d) => (
            <div key={d.id} className="flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg group hover:bg-paper-warm transition-colors">
              <Link href={`/documents/${d.id}`} className="flex-1 text-sm text-bark hover:text-canopy transition-colors min-w-0 truncate">
                {d.title}
              </Link>
              <button type="button" onClick={() => handleRemove("document", d.id)} className="opacity-0 group-hover:opacity-100 text-bark-muted hover:text-earth transition-all shrink-0" aria-label="Unlink document">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Proposals */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2">
            <Lightbulb size={13} />
            Proposals ({proposals.length})
          </h2>
          {availableProposals.length > 0 && (
            <button
              type="button"
              onClick={() => { setShowForm("proposal"); setTarget(""); }}
              className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
            >
              <Plus size={13} />
              Link proposal
            </button>
          )}
        </div>
        {renderForm(
          "proposal",
          availableProposals.map((p) => ({ id: p.id, label: p.title })),
          "Select a proposal..."
        )}
        {proposals.length === 0 && showForm !== "proposal" && (
          <p className="text-sm text-bark-muted/60">No linked proposals.</p>
        )}
        <div className="space-y-1">
          {proposals.map((p) => (
            <div key={p.id} className="flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg group hover:bg-paper-warm transition-colors">
              <Link href={`/proposals/${p.id}`} className="flex-1 text-sm text-bark hover:text-canopy transition-colors min-w-0 truncate">
                {p.title}
              </Link>
              <button type="button" onClick={() => handleRemove("proposal", p.id)} className="opacity-0 group-hover:opacity-100 text-bark-muted hover:text-earth transition-all shrink-0" aria-label="Unlink proposal">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

**Step 2: Update meeting detail page to fetch and pass data**

In `src/app/(app)/meetings/[id]/page.tsx`:

Add imports at top:
```typescript
import { getDecisionsList, getActionsList, getDocumentsList, getProposalsList } from "@/lib/queries";
import { MeetingLinksEditor } from "./meeting-links-editor";
```

Note: `getActionsList`, `getDocumentsList`, `getProposalsList` may not exist yet — check queries.ts. If they don't exist, add simple list queries (see step 3).

After the `getMeetingById` call (line ~59), fetch available entities:

```typescript
const [allDecisions, allActions, allDocuments, allProposals] = await Promise.all([
  getDecisionsList(space.id),
  getActionsList(space.id),
  getDocumentsList(space.id),
  getProposalsList(space.id),
]);
```

Replace the existing "Decisions made" section (lines 212-239) with the MeetingLinksEditor component:

```typescript
<MeetingLinksEditor
  meetingId={meeting.id}
  decisions={meeting.decisions}
  actions={meeting.actions}
  documents={meeting.documents}
  proposals={meeting.proposals}
  allDecisions={allDecisions}
  allActions={allActions}
  allDocuments={allDocuments}
  allProposals={allProposals}
/>
```

Update sidebar stats (lines 272-294) to include all four counts.

**Step 3: Add missing list queries if needed**

Check if `getActionsList`, `getDocumentsList`, `getProposalsList` exist in `queries.ts`. If not, add them:

```typescript
export async function getActionsList(spaceId: string) {
  return db
    .select({ id: actions.id, description: actions.description })
    .from(actions)
    .where(eq(actions.spaceId, spaceId))
    .orderBy(desc(actions.createdAt));
}

export async function getDocumentsList(spaceId: string) {
  return db
    .select({ id: documents.id, title: documents.title })
    .from(documents)
    .where(eq(documents.spaceId, spaceId))
    .orderBy(documents.title);
}

export async function getProposalsList(spaceId: string) {
  return db
    .select({ id: proposals.id, title: proposals.title })
    .from(proposals)
    .where(eq(proposals.spaceId, spaceId))
    .orderBy(desc(proposals.createdAt));
}
```

**Step 4: Commit**

```bash
git add src/app/(app)/meetings/[id]/meeting-links-editor.tsx src/app/(app)/meetings/[id]/page.tsx src/lib/queries.ts
git commit -m "feat: add meeting entity linking UI on meeting detail page"
```

---

### Task 7: Meeting summary page — show linked entities

**Files:**
- Modify: `src/app/(app)/meetings/[id]/summary/page.tsx`

**Step 1: Add linked actions, documents, proposals sections**

The meeting summary page already shows decisions (lines 120-147). After that section, add similar sections for actions, documents, and proposals using the data already available from `getMeetingById`:

```typescript
{/* Actions from this meeting */}
{meeting.actions.length > 0 && (
  <section>
    <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2 mb-4">
      <CheckSquare size={13} />
      Actions assigned
    </h2>
    <div className="space-y-2">
      {meeting.actions.map((action) => (
        <div key={action.id} className="flex items-center gap-3 py-3 px-3 -mx-3 border-b border-border last:border-b-0">
          <span className="text-sm text-bark flex-1">{action.description}</span>
          {action.ownerName && (
            <span className="text-xs text-bark-muted">{action.ownerName}</span>
          )}
        </div>
      ))}
    </div>
  </section>
)}
```

Add similar sections for documents and proposals. Import `CheckSquare`, `FileText`, `Lightbulb` from lucide-react.

Update the stats strip to include actions, documents, proposals counts.

**Step 2: Commit**

```bash
git add src/app/(app)/meetings/[id]/summary/page.tsx
git commit -m "feat: show linked actions, documents, proposals on meeting summary"
```

---

### Task 8: Entity detail pages — show linked meetings with link/unlink

**Files:**
- Create: `src/components/meeting-links.tsx` (shared component for all entity pages)
- Modify: `src/app/(app)/documents/[id]/page.tsx`
- Modify: `src/app/(app)/proposals/[id]/page.tsx`

**Step 1: Create shared MeetingLinks component**

This component is used on document, proposal, and (optionally) action pages. It follows the same pattern as the meeting section in `decision-links-editor.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Plus, X } from "lucide-react";
import { linkToMeeting, unlinkFromMeeting } from "@/lib/meeting-link-actions";
import { formatDate } from "@/lib/utils";

type EntityType = "decision" | "action" | "document" | "proposal";

export function MeetingLinks({
  entityType,
  entityId,
  linkedMeetings,
  allMeetings,
}: {
  entityType: EntityType;
  entityId: string;
  linkedMeetings: { meetingId: string; title: string; date: string }[];
  allMeetings: { id: string; title: string; date: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [target, setTarget] = useState("");

  const available = allMeetings.filter(
    (m) => !linkedMeetings.some((lm) => lm.meetingId === m.id)
  );

  function handleAdd() {
    if (!target) return;
    startTransition(async () => {
      await linkToMeeting(target, entityType, entityId);
      setShowForm(false);
      setTarget("");
      router.refresh();
    });
  }

  function handleRemove(meetingId: string) {
    startTransition(async () => {
      await unlinkFromMeeting(meetingId, entityType, entityId);
      router.refresh();
    });
  }

  const selectClass =
    "w-full text-sm border border-border rounded-lg px-3 py-2 bg-paper text-bark focus:outline-none focus:ring-2 focus:ring-canopy/20";

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2">
          <Calendar size={14} />
          Meetings
        </h2>
        {available.length > 0 && (
          <button
            type="button"
            onClick={() => { setShowForm(!showForm); setTarget(""); }}
            className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
          >
            <Plus size={13} />
            Link meeting
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 p-3 bg-paper-warm rounded-lg border border-border space-y-2">
          <select value={target} onChange={(e) => setTarget(e.target.value)} className={selectClass}>
            <option value="">Select a meeting...</option>
            {available.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({formatDate(m.date)})
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="button" onClick={handleAdd} disabled={!target || isPending} className="px-3 py-1.5 text-xs font-medium text-paper bg-canopy rounded-lg hover:bg-canopy-light transition-colors disabled:opacity-50">
              Link
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-bark-muted hover:text-bark transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {linkedMeetings.length === 0 && !showForm && (
        <p className="text-sm text-bark-muted/60">Not linked to a meeting.</p>
      )}

      <div className="space-y-1">
        {linkedMeetings.map((m) => (
          <div key={m.meetingId} className="flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg group hover:bg-paper-warm transition-colors">
            <Link href={`/meetings/${m.meetingId}`} className="flex-1 text-sm text-bark hover:text-canopy transition-colors min-w-0 truncate">
              {m.title}
            </Link>
            <span className="text-xs text-bark-muted shrink-0">{formatDate(m.date)}</span>
            <button type="button" onClick={() => handleRemove(m.meetingId)} className="opacity-0 group-hover:opacity-100 text-bark-muted hover:text-earth transition-all shrink-0" aria-label="Unlink meeting">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
```

**Step 2: Add MeetingLinks to the document detail page**

In `src/app/(app)/documents/[id]/page.tsx`, import and use:

```typescript
import { getDocumentMeetings, getMeetingsList } from "@/lib/queries";
import { MeetingLinks } from "@/components/meeting-links";
```

Fetch the data (add to existing data fetches):
```typescript
const [documentMeetings, allMeetings] = await Promise.all([
  getDocumentMeetings(document.id),
  getMeetingsList(space.id),
]);
```

Add the component after the existing content:
```typescript
<MeetingLinks
  entityType="document"
  entityId={document.id}
  linkedMeetings={documentMeetings.map(m => ({ ...m, date: m.date.toISOString() }))}
  allMeetings={allMeetings.map(m => ({ ...m, date: m.date.toISOString() }))}
/>
```

**Step 3: Add MeetingLinks to the proposal detail page**

Same pattern — import, fetch `getProposalMeetings` + `getMeetingsList`, render `<MeetingLinks>`.

**Step 4: Update decision detail page to use shared MeetingLinks**

The decision detail page already has meeting link/unlink UI in `decision-links-editor.tsx`. This already works — no changes needed unless you want to unify the component. Leave as-is to avoid unnecessary refactoring.

**Step 5: Add meeting links to the actions page**

In `src/app/(app)/actions/page.tsx`, for each action show its linked meetings. Extend `getActions` query to LEFT JOIN through `meeting_actions` and include meeting title if linked.

Or simpler: just show a meeting icon/badge on actions that are linked to a meeting — the full link/unlink UI can live on the meeting detail page since actions don't have their own detail page.

**Step 6: Commit**

```bash
git add src/components/meeting-links.tsx src/app/(app)/documents/[id]/page.tsx src/app/(app)/proposals/[id]/page.tsx src/app/(app)/actions/page.tsx
git commit -m "feat: add meeting link/unlink UI to document, proposal, and action pages"
```

---

### Task 9: Verify and fix build

**Step 1: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no type errors

**Step 3: Fix any issues found**

Address lint/type errors.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve lint and type errors from meeting linking feature"
```

---

### Task 10: Manual testing checklist

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test meeting detail page**

- Navigate to a meeting detail page
- Verify "Decisions", "Actions", "Documents", "Proposals" sections appear
- Click "Link decision" — verify dropdown shows available decisions
- Select and link a decision — verify it appears in the list
- Hover and click X to unlink — verify it's removed
- Repeat for actions, documents, proposals

**Step 3: Test entity backlinks**

- Navigate to a decision detail page — verify linked meetings section has link/unlink
- Navigate to a document detail page — verify "Meetings" section appears
- Navigate to a proposal detail page — verify "Meetings" section appears
- Link a meeting from each page, verify it appears

**Step 4: Test live meeting auto-linking**

- Start a live meeting, record a decision with an action
- End the meeting, navigate to the meeting detail page
- Verify the action is automatically linked to the meeting

**Step 5: Test meeting summary page**

- Navigate to a completed meeting's summary page
- Verify linked actions, documents, proposals appear in the summary
