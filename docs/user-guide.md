# User Guide

This guide covers everything you need to know about using Glade — from logging your first decision to running live meetings and sharing your governance record publicly.

---

## Signing in

Glade offers four ways to sign in:

- **Email and password** — create an account with your email address
- **Magic link** — enter your email and receive a one-click sign-in link
- **Google** — sign in with your Google account
- **Microsoft** — sign in with your Microsoft (Entra ID) account

New users can sign up from the sign-in page. Once signed in, you'll land on the dashboard.

---

## Spaces

A space is your organisation's home in Glade. Everything — decisions, meetings, documents — lives inside a space.

You can belong to multiple spaces (for example, if you sit on two boards). Use the **space switcher** in the sidebar to move between them, or create a new space from there.

Each space has its own members, settings, and governance record. Within a space, members have one of three roles:

- **Admin** — full access, including settings, member management, and billing
- **Member** — can create and edit decisions, meetings, documents, and more
- **Observer** — read-only access to everything in the space

---

## Dashboard

The dashboard is your home screen. It adapts to your space's activity.

**For new spaces**, you'll see a getting-started checklist guiding you through setup — creating your space, inviting a member, logging your first decision, and recording a meeting.

**For active spaces**, the dashboard shows:

- A greeting with a quick summary of your space's governance activity
- **Stats** — decisions this month, open actions, follow-through rate, review rate, and reviews due
- **Governance health** (once you have 5+ decisions) — participation rate, decision method variety, revision rate, stale documents, and time from proposal to decision
- **Recent decisions** — the last four decisions with status, method, and action progress
- **Open actions** — up to four urgent actions, sorted by urgency (overdue first)
- **Upcoming reviews** — decisions with review dates approaching
- **Recent meetings** — the last three meetings

If your space has AI features enabled (Canopy plan), additional panels appear: AI Insights, Governance Digest, and Member Briefing.

---

## Decisions

Decisions are the heart of Glade. Every governance choice your organisation makes can be recorded here with full context.

### Logging a decision

Click **Log a decision** from the decision list or dashboard. Fill in:

- **Title** — a clear name for the decision
- **Description** — the context and background
- **Rationale** — why this decision was made
- **Decision method** — how it was decided (consent, advice process, consensus, majority vote, delegation, or lazy consensus)
- **Outcome** — the actual result
- **Participants** — who was involved
- **Date** — when it was made
- **Conditions** — any conditions or constraints (optional)
- **Review date** — when it should be revisited (optional)
- **Tags** — for organising and filtering (optional)

If your space has public visibility enabled, decisions are public by default. Tick "Hide from public page" to keep a specific decision private.

### Decision lifecycle

Each decision moves through four stages:

1. **Decided** — the decision has been made
2. **Implemented** — actions arising from it are underway
3. **Reviewed** — a structured reflection has taken place
4. **Learned** — insights have been drawn and recorded

Advance a decision through its lifecycle from its detail page using the status button.

### Decision detail

The detail page shows the full record: context, rationale, outcome, actions, lifecycle progress, participants, method, tags, and linked decisions.

You can link decisions together with three relationship types:
- **Supersedes** — this decision replaces the linked one
- **Amends** — this decision modifies the linked one
- **Relates to** — the decisions are connected but independent

### Searching and filtering

The decision list supports full-text search across titles, descriptions, and outcomes. Use the filter panel to narrow by status, method, tags, participants, or date range.

### Deleting a decision

Delete a decision from its detail page. Deletions are logged to the audit trail.

### Exporting

Click **Export to CSV** on the decision list to download all decisions as a spreadsheet.

---

## Actions

Actions are follow-up tasks that flow from governance work. They can be attached to decisions, proposals, or topics — wherever a next step is identified.

Add actions from a decision, proposal, or topic detail page, or create them directly from the **Actions** page. Each action has a description, owner, and optional due date.

### Action statuses

Click the status icon on any action to cycle through:

- **Open** — not yet started
- **In progress** — being worked on
- **Complete** — done

Actions past their due date are automatically marked **overdue** and highlighted in red.

The actions list sorts by urgency: overdue actions first, then in-progress, then open, then complete.

---

## Meetings

Meetings connect decisions to where and how they were made.

### Creating a meeting

From the meetings list, create a meeting with:

- **Title** and **date**
- **Type** — Board, Team, AGM, EGM, Committee, Working Group, or Other
- **Facilitator** — assign a specific member to run the meeting (defaults to the meeting creator)
- **Notes** — free text for any pre-meeting notes
- **Agenda items** — each with a title, type (For Decision, For Discussion, or For Information), estimated duration, and optional description

You can pull existing proposals or topics directly into the agenda. The proposal picker includes draft proposals as well as those open for discussion or ready for decision.

### Sharing the agenda

Click **Share agenda** on a meeting to generate a public link (and QR code). Anyone with the link can view the agenda, attendees, and time estimates — no sign-in required. Useful for circulating the agenda before a meeting.

### Running a live meeting

When you start a meeting, the facilitator sees a full control panel:

- **Agenda sidebar** — shows all items with their status (pending, active, completed, skipped). Click any item to jump to it.
- **Timer** — set a duration from the agenda item's estimate, then start, pause, or reset.
- **Speaker stack** — participants raise their hands, and the facilitator sees them queued in order.
- **Navigation** — advance to the next item, skip an item, or run a temperature check.

**Other participants** see a read-only view of the current item and timer, with a raise/lower hand button and the ability to participate in decision flows.

### Decision flows

For agenda items marked "For Decision", the facilitator can choose a decision method and start a formal decision flow:

- **Consent** — a six-stage process (present, clarify, react, object, integrate, decide). Participants share reactions and raise objections. If no objections, the integration stage is skipped automatically.
- **Majority vote** — participants cast for, against, or abstain votes. Results are tallied against the space's pass threshold (configurable in Settings).
- **Advice process** — participants submit advice as free text. The facilitator reviews all advice before recording the decision.
- **Delegation** — for delegating authority with defined scope and constraints.
- **Lazy consensus** — present the proposal, then record unless objections arise.
- **Temperature check** — a quick pulse to gauge sentiment before a formal process.

The facilitator can navigate back between stages within a flow if needed.

**Proposal-backed agenda items** get special treatment: when the facilitator reaches an agenda item that was added from a proposal, the decision flow starts automatically using the proposal's suggested method. The proposal's rationale is displayed for context. When the decision is recorded, the proposal is automatically marked as "Decided" and linked to the new decision record.

When a flow completes, the facilitator records the decision directly from the meeting — it appears immediately in the decision log.

### Linking entities to meetings

From a meeting's detail page, you can link related decisions, documents, and proposals to the meeting record. This creates a cross-reference that appears on both the meeting and the linked item. Actions created during live meeting decision flows are linked automatically.

### Importing transcripts

If you have a meeting transcript (from a recording service, for example), you can import it into Glade. Paste the transcript text, and AI extracts decisions, actions, and topics from the conversation. Review and edit the extracted items, then import them into a new meeting or add them to an existing one.

### After the meeting

When the meeting ends, the **summary page** shows:

- Stats: decisions made, items covered, items skipped, attendees
- Links to all decisions recorded during the meeting
- Linked documents, proposals, and actions
- Agenda outcomes — which items were completed, skipped, or not reached
- An AI-generated narrative summary (if AI features are enabled)

Use the **Print** button to generate a print-friendly version suitable for saving as PDF minutes.

### Deleting a meeting

Delete a meeting from its detail page. The deletion is logged to the audit trail with a snapshot of the meeting's details.

---

## Documents

Governance documents in Glade are living records shaped by your decisions.

### Document types

Documents are grouped by type: Constitution, Terms of Reference, Policy, Role Description, Standing Orders, or Other.

### Creating and editing

Create a document with a title, type, and content. You can import from a Markdown file on creation. The editor is a rich-text editor with bold, italic, headings, lists, links, and more. Changes auto-save every 1.5 seconds with a visible status indicator.

Documents start as **Draft** and can be published when ready. Toggle between Draft and Published at any time.

### Version history

Every save creates a new version. View the full version timeline from the **History** page — each entry shows the version number, change description, author, date, and any linked decision that prompted the change.

Select any two versions to see a **side-by-side diff** highlighting what was added and removed. You can also view the document exactly as it appeared at any past version.

### Decision trails

Headings in a document can be linked to the decisions that shaped them. When a section heading has a linked decision, clicking it reveals a "Why does this exist?" popover showing the decision that created or modified that clause. This makes your governance documents self-documenting.

### Downloading

Download any document as **Markdown** or **Word (.docx)** from its detail page.

---

## Proposals

Proposals are structured documents for developing ideas before they reach a formal decision.

### Proposal lifecycle

1. **Draft** — initial writing, not yet shared
2. **Open for discussion** — published for team input
3. **Ready for decision** — discussion complete, awaiting a decision
4. **Decided** — a formal decision has been recorded
5. **Implemented** — the decision has been put into action

### Discussion

Each proposal has a threaded discussion section. Team members can post comments and reply to each other, building a structured conversation around the proposal.

### References

Attach supporting URLs and links to a proposal for context.

### Adding proposals to meeting agendas

From a proposal's detail page, click **Add to agenda** to place it on an upcoming meeting's agenda as a "For Decision" item. You can also pull proposals into agendas from the meeting form when creating or editing a meeting.

During the meeting, proposal-backed agenda items automatically start a decision flow using the proposal's suggested method, and the proposal is linked to the resulting decision when recorded.

### From proposal to decision

When a proposal is marked "Decided", Glade prompts you to create a formal decision record. The decision is pre-filled from the proposal and the two are linked.

---

## Topics

Topics are lightweight prompts for surfacing things that need governance attention but aren't ready to be full proposals yet.

### Topic types

- **Question** — something the group needs an answer to
- **Tension** — a problem, friction, or misalignment worth naming
- **Agenda suggestion** — a request to put something on a future meeting agenda

### Promoting to proposals

When a topic is ready for more structured discussion, use **Promote to proposal** to convert it into a full proposal. The topic and proposal are linked, and the topic shows a "Promoted" badge.

Topics can also be pulled directly into meeting agendas.

---

## The Glade

The Glade is a full-screen interactive canvas that visualises every decision in your space as a node on a 2D map.

### What you see

Each decision appears as a circular node. The node's colour reflects its lifecycle status:

- **Sky blue** — decided
- **Green** — implemented
- **Amber** — reviewed
- **Earth** — learned

Small dots around each node show action progress — filled dots are complete, hollow dots are still open. Lines between nodes show decision relationships (supersedes, amends, relates to).

### Interacting

- **Click** a node to open a popover with the decision's full details — number, title, status, method, date, rationale, outcome, participants, tags, action progress, and linked decisions
- **Pan and zoom** using the controls or mouse/touch gestures
- Use the **keyboard** to navigate between nodes

The Glade respects your system's reduced-motion preference — if you have "reduce motion" enabled, node animations are turned off.

---

## AI features

AI features are available on the **Canopy plan** and must be enabled per-space in Settings. All AI actions are triggered manually — nothing runs in the background.

### Pattern analysis

From the AI Insights panel on the dashboard, analyse your governance patterns. Glade reviews all your decisions and surfaces insights about decision-method distribution, action follow-through, review patterns, and governance health. Insights appear as cards that you can dismiss when read.

### Decision review questions

When a decision has a review date set, an AI panel on the detail page generates five tailored reflection questions — did it achieve its outcome? Is it still relevant? Were there unintended consequences?

### Document impact suggestions

After recording a decision, AI suggests which governance documents might need updating as a result, with a brief explanation for each.

### Stale document detection

On the documents page, check for stale documents. AI cross-references recent decisions against your documents and flags any that may need updating, with the relevant decision numbers.

### Draft document updates

After a stale flag, ask AI to draft specific text changes — it quotes the existing wording and suggests replacement text with a rationale.

### Governance digest

A monthly summary covering decisions made, action progress, document updates, upcoming reviews, and governance improvement recommendations.

### New member briefing

An onboarding document for new members covering how decisions are typically made, key active decisions, document summaries, ongoing actions, and upcoming reviews.

### Meeting summary

After a meeting ends, an AI-generated narrative summary covering the meeting overview, decisions made, actions created, key discussions, and follow-up recommendations.

---

## Public governance pages

Share your governance record publicly to build trust and demonstrate accountability.

### Enabling public visibility

In **Settings → Public Visibility**, toggle on the sections you want to make public:

- Decision log
- Actions
- Meeting records
- Governance documents
- Proposals
- Topics
- The Glade (visual canvas)

When enabled, each section gets a dedicated public page at `/public/your-space/section-name`. Copyable links appear in Settings.

### Per-item visibility

When a section is public, new items default to public. To keep a specific item private, tick **"Hide from public page"** when creating or editing it. Hidden items show a "Hidden" badge on their detail page.

### Embedding

When the public decision log is enabled, Settings shows an iframe embed code. Paste it into your organisation's website to display a compact, live decision log.

### Shared meeting agenda

Any meeting can have a **shared agenda link** generated (with QR code). Share it before or during a meeting so non-members can view the agenda without signing in.

---

## Settings

Access settings from the sidebar. Editing is restricted to admins.

### General

- Space name and description
- Restart the onboarding walkthrough

### Plan and billing

- View your current plan (Seedling, Canopy, or Old Growth) and usage
- Upgrade, manage billing, or cancel through Stripe

### AI features

- Toggle AI features on or off for the space (Canopy plan required)

### Meeting configuration

- Set the vote pass threshold for live meeting vote flows: simple majority, three-fifths, two-thirds, or three-quarters

### Public visibility

- Toggle public access for each governance section (see "Public governance pages" above)

### API keys

- Create named API keys for programmatic access to your governance data
- Set read and/or write permissions, optional expiry dates
- Keys are shown once on creation — store them securely

### Webhooks

- Set up outbound webhooks that fire when decisions are created, updated, or change status
- Payloads are signed for verification by the receiving system

### Audit log

The Settings page includes an audit log showing all deletions across the space — what was removed, when, and by whom. Each entry includes a snapshot of the deleted item's key details.

### Danger zone

- **Clear all data** — removes all governance data but keeps members and settings (requires typing "CLEAR")
- **Delete space** — permanently removes everything (requires typing the space name)

---

## Members

Manage your space's members from the **Members** page in the sidebar.

- **Invite** new members by email
- **Assign roles** — Admin, Member, or Observer
- **Remove** members who have left

Member limits depend on your plan: Seedling allows 5, Canopy allows 25, and Old Growth is unlimited.

---

## REST API

Glade provides a read API for integrating with other tools. Authenticate with an API key (created in Settings).

Available endpoints:

- Decisions — list all or fetch one by number
- Documents — list all or fetch one by ID
- Meetings — list all
- Actions — list all

Combine with webhooks for event-driven integrations — for example, posting a Slack message whenever a decision is recorded.
