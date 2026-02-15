# GitHub for Governance — Project Plan

**A decision-centric platform for transparent, learning-oriented governance**

| | |
|---|---|
| **Author** | Tom CW / The Good Ship |
| **Version** | 0.1 — Concept & Architecture |
| **Date** | February 2026 |
| **Status** | Draft |
| **Model** | Hosted SaaS (open source core) |

---

## 1. Vision & Problem Statement

### 1.1 The Problem

Governance in social purpose organisations is both critically important and chronically under-resourced. Decisions are scattered across emails, minutes documents, and informal conversations. There is rarely a clear trail connecting a current policy to the decision that created it, the rationale behind it, or the people who were in the room. When board members or staff change, institutional knowledge walks out the door.

The result is that organisations repeatedly re-litigate old decisions, struggle to onboard new trustees or partners, and find it difficult to learn from their own governance history. Compliance-focused tools solve for documentation but not for learning. Collaboration tools solve for communication but not for accountability.

### 1.2 The Vision

A platform that treats governance decisions as the primary unit of organisational memory. Every decision is traceable: what was decided, by whom, using what method, with what rationale, and what happened next. Governance documents are living artefacts derived from decisions, not static files. The platform supports organisations not just in recording governance but in improving how they govern over time.

### 1.3 Core Principles

- **Decision log as spine.** The decision log is the source of truth. Everything else — documents, meetings, proposals — feeds into or derives from it.
- **Governance provenance.** Every policy clause, every role definition, every standing commitment traces back to a decision, a moment, and a rationale.
- **Learning over compliance.** The platform is designed to help organisations get better at governing, not just prove they governed.
- **Minimal viable ceremony.** Governance tools fail when they add friction. Every feature must reduce effort or it doesn't ship.
- **Internal first, transparency optional.** Organisations control what is visible externally. The default is a well-organised internal tool.

---

## 2. Conceptual Architecture

### 2.1 The Decision-Centric Model

The architecture is event-sourced at its conceptual core. The decision log is an append-only record of governance events. The current state of governance documents is a projection — computed by replaying the decisions that affect each document. Meetings and proposals are input mechanisms to the log. Reviews and insights are feedback mechanisms from the log.

This is analogous to git: the commit log is primary, the current file state is derived. But the interface never exposes this complexity. Users see current documents and a searchable timeline — not commits and diffs.

### 2.2 Data Model

Six core objects, with clear relationships:

| Object | Description | Key Relationships |
|--------|-------------|-------------------|
| **Space** | An organisation, project, or collaboration. The top-level container. | Has members, documents, meetings, decisions |
| **Decision** | The atomic unit. What was decided, when, by whom, using what method, with what rationale. | Linked to meeting (if synchronous), proposal (if formal), documents (if affected), actions (if follow-up), review (if scheduled) |
| **Document** | A living governance artefact: constitution, terms of reference, policy, role description. | Current state derived from decisions. Version history shows decision trail. |
| **Proposal** | A request for a decision. May link to document changes. | Has discussion thread, decision method, lifecycle status. Becomes a decision when resolved. |
| **Meeting** | A container for synchronous decision-making. | Has agenda (from proposals/topics), attendance, links to decisions made. |
| **Topic** | Lightweight item: question, tension, agenda suggestion. | Can become a proposal. Can be pulled into a meeting agenda. |

Supporting objects: Actions (follow-up tasks with owners, linked to decisions), Reviews (structured reflections on past decisions), and Insights (AI-generated observations, linked to decisions or the space).

### 2.3 Decision Lifecycle

Decisions move through an extended lifecycle that supports learning:

| Stage | What Happens | Who's Involved |
|-------|-------------|----------------|
| **Proposed** | A proposal is created with rationale, context, and suggested decision method. | Proposer, affected parties |
| **Discussed** | Async or sync discussion. Comments, amendments, questions. | Members with relevant roles |
| **Decided** | Decision made using chosen method. Outcome, participation, and conditions recorded. | Decision-makers per method |
| **Implemented** | Actions created and tracked. Governance documents updated if affected. | Action owners |
| **Reviewed** | Structured reflection: what happened, what was expected, what surprised us. | Original decision-makers + facilitator |
| **Learned** | Patterns synthesised. Insights feed back into future governance. | Leadership / governance lead |

Not every decision will reach the Reviewed and Learned stages. The platform supports scheduling reviews and prompting reflection, but never forces it. The goal is to make learning easy, not mandatory.

---

## 3. Learning Loops & Decision Quality

The platform borrows from triple loop learning to support continuous improvement of governance practice. Each loop operates at a different level of abstraction and timescale.

### 3.1 Single Loop: Did We Follow Through?

After a decision is made, track what happened. Were actions completed? Did the expected outcome materialise? This is basic accountability — but most organisations lack even this. The decision log creates a feedback loop simply by prompting the question: what happened next?

- **Mechanism:** Actions linked to decisions with status tracking. Overdue action alerts. Simple outcome recording on each decision.
- **Prompt:** "Decision #42 was made 3 months ago. 2 of 3 actions are complete. Has the expected outcome been achieved?"

### 3.2 Double Loop: Did We Decide Well?

At a scheduled interval or triggered by events, revisit the decision itself. Was the framing right? Did we have the right information? Did we involve the right people? Were there consequences we didn't anticipate? This is not about blame — it is about pattern recognition across decisions.

- **Mechanism:** Scheduled decision reviews. Structured review template: original context vs actual outcome, surprises, what we'd change.
- **Prompt:** "When this was decided, the main concern was reputational risk. Has that materialised? Were there risks that weren't discussed?"

### 3.3 Triple Loop: Are We Governing Well?

Zoom out further. Are our decision-making processes and assumptions serving us? Are we using consent-based methods but actually defaulting to deference? Are we consulting widely but always landing on the same perspective? This is meta-governance — governance about governance.

- **Mechanism:** Governance health analytics. AI-assisted pattern recognition across the full decision log. Periodic governance reviews prompted by the platform.
- **Prompt:** "Your organisation has made 40 decisions this year. 85% passed without objection in consent rounds. This could mean excellent proposals, or it could mean the process isn't surfacing genuine concerns."

### 3.4 Decision Quality Indicators

Over time, the decision log accumulates enough data to surface governance health patterns. These are not scores or judgements — they are observations that invite reflection:

- Review rate: what proportion of decisions are revisited?
- Follow-through rate: how many actions reach completion?
- Participation distribution: is decision-making concentrated or distributed?
- Method diversity: are different decision types using appropriate methods?
- Revision frequency: how often do reviewed decisions lead to changes?
- Governance document currency: how recently were key documents updated?
- Time-to-decision: how long from proposal to resolution?

> **🔌 MODULE: AI-Assisted Decision Quality**
>
> *Expandable module for AI-powered governance intelligence. Not required for core functionality.*
>
> - Pattern analysis: surface recurring themes across decisions (e.g. partnership decisions consistently revisited within 3 months)
> - Review prompter: generate context-aware reflection questions based on original decision rationale and current context
> - Document impact: suggest which governance documents may be affected by a new decision
> - Governance health advisor: periodic digest of meta-observations about decision-making patterns
> - New member briefing: generate "what you need to know" summaries from decision history
> - Integration: Anthropic API (Claude) with structured prompts. Background analysis jobs, not real-time.

---

## 4. Supported Decision Methods

A key differentiator is native support for multiple decision-making methods, with guided flows rather than just labels. The platform should actively help facilitators and participants navigate each method correctly.

### 4.1 Consent-Based Decision Making

The default method for governance decisions in many progressive organisations. A proposal is adopted unless there is a "paramount objection" — an objection based on evidence that the proposal would cause harm or move the organisation outside its purpose. This is distinct from consensus (everyone agrees) or majority voting (most people agree).

**Guided flow:** Present proposal → Clarifying questions → Quick reactions → Objection round → Integration (if objections) → Decision recorded with any amendments and conditions.

### 4.2 Other Methods

| Method | When to Use | Platform Support |
|--------|-------------|-----------------|
| **Majority vote** | Binary choices, large groups, lower-stakes operational decisions | Vote capture, threshold configuration, result recording |
| **Advice process** | Individual has authority but must consult affected parties before deciding | Consultation tracking: who was consulted, what input was given, final decision with rationale |
| **Delegation** | Authority granted to a role or individual for a category of decisions | Delegation record: scope, constraints, reporting requirements, review date |
| **Consensus** | High-stakes decisions requiring full agreement | Temperature checks, blocking concern capture, iteration tracking |
| **Lazy consensus** | Low-stakes decisions where silence implies agreement | Time-boxed objection window, auto-adoption if no objections raised |

> **🔌 MODULE: Decision Method Templates & Flows**
>
> *Expandable library of guided decision-making workflows with facilitation prompts.*
>
> - Step-by-step facilitation scripts for each method (consent rounds, advice process consultation tracking)
> - Configurable thresholds and rules per space (e.g. quorum requirements, objection criteria)
> - Method recommendation: suggest appropriate method based on decision type and stakes
> - Custom method builder: organisations define their own decision workflows
> - Integration with meeting mode: guided flows appear on facilitator and participant screens during live meetings

---

## 5. Build Phases

### Phase 0: Design & Validate (2–3 weeks)

**Objective:** Validate the concept with real users, finalise the data model, and produce wireframes for the core flows.

- Define 3 detailed user journeys: board updating a policy, working group making a funding decision, new trustee onboarding and understanding governance history
- Wireframe core screens: decision log, decision detail with review, proposal flow, meeting record, governance document with history
- Finalise data model and API shape
- Identify 1–2 pilot organisations for co-design and early testing
- Choose project name

### Phase 1: Core Decision Log (5–6 weeks)

**Objective:** A usable tool for recording decisions, linking them to meetings, and tracking follow-through. Valuable on its own with no process change required.

**Authentication & Multi-tenancy**

- Clerk authentication with organisation support
- Space creation and member management with roles (admin, member, observer)
- Invitation flow via email link

**Decision Log**

- Create decisions with: title, description, rationale, decision method used, outcome, participants, date, conditions
- Tag decisions by theme (finance, HR, strategy, partnerships, governance, custom)
- Decision status lifecycle: decided → implemented → reviewed → learned
- Schedule reviews: set a review date or trigger condition on any decision
- Link decisions to each other (e.g. "supersedes Decision #12")

**Meeting Records**

- Create meeting records with: date, type, attendees, notes
- Link decisions to the meeting where they were made
- Simple agenda: list of items discussed

**Actions**

- Create actions from decisions with: description, owner, due date
- Action status tracking: open, in progress, complete, overdue
- Dashboard view of outstanding actions across the space

**Views & Search**

- Timeline view: all decisions in chronological order
- Filterable by: theme, status, method, date range, participant
- Full-text search across decisions and meeting records
- Simple analytics: decision count, review rate, action completion rate

### Phase 2: Governance Documents & Proposals (4–5 weeks)

**Objective:** Governance documents become living artefacts with full provenance, and proposals create a structured path from idea to decision.

**Governance Documents**

- Create and edit governance documents using a block-based editor (Tiptap/ProseMirror)
- Document types: constitution, terms of reference, policy, role description, standing orders, custom
- Link decisions to specific sections of documents
- Version history with diffs: see exactly what changed and which decision drove the change
- Current vs historical view: "show me this document as it was on [date]"
- "Why does this clause exist?": click any section to see the decision trail

**Proposals**

- Create proposals with: title, description, rationale, affected documents, suggested decision method
- Discussion thread on each proposal: comments, questions, suggested amendments
- Proposal lifecycle: draft → open for discussion → ready for decision → decided → implemented
- Attach supporting materials (documents, links, data)
- When a proposal becomes a decision, governance documents are prompted for update

**Topics**

- Lightweight topic creation: questions, tensions, future agenda items
- Topics can be promoted to proposals
- Topics can be pulled into meeting agendas

> **🔌 MODULE: Governance Templates Library**
>
> *Pre-built governance document templates and structures for common organisational types.*
>
> - Board meeting template with standard agenda structure
> - Charity constitution template (aligned with Charity Commission guidance)
> - Terms of reference template for committees and working groups
> - Sociocratic circle governance template
> - Partnership agreement governance framework
> - Funding panel decision framework
> - Role description template with accountability mapping
> - Community-contributed templates (longer term)

### Phase 3: AI Layer (3–4 weeks)

**Objective:** Add intelligent assistance that helps organisations learn from their governance history. AI operates as a reflective partner, never a decision-maker.

**Pattern Analysis**

- Background analysis job runs periodically against the decision log
- Surfaces patterns: frequently revisited decision types, common gaps in consultation, recurring themes
- Results stored as Insights linked to relevant decisions or the space

**Decision Review Prompter**

- When a decision comes up for review, generate context-aware reflection questions
- Questions reference the original rationale, concerns raised, and decision method used
- Structured review output: what happened, what was expected, what surprised us, what we'd do differently

**Governance Document Intelligence**

- When a new decision is logged, suggest which governance documents might be affected
- Flag documents that haven't been reviewed relative to recent decisions
- Help draft document updates from decision text

**Insights & Digest**

- Insights panel: browsable list of AI observations, dismissable or actionable
- Monthly governance digest: summary of decisions, patterns, and suggested reviews
- New member briefing generator: "what you need to know about how we govern"

**Architecture**

- Anthropic API (Claude) with structured prompts and system instructions
- Prompt template system: each analysis type has its own template combining decision data with governance knowledge
- Background job processing (not real-time, not in meeting flow)
- User controls: organisations can disable AI features entirely

> **🔌 MODULE: Advanced AI Features**
>
> *Future AI capabilities that build on the core intelligence layer.*
>
> - Governance health dashboard: triple-loop learning indicators visualised over time
> - Decision method recommendation: suggest appropriate method based on proposal characteristics
> - Cross-space learning: anonymised pattern sharing across organisations (with consent)
> - Natural language queries: "Show me all finance decisions from last year that were later revised"
> - Facilitation coaching: real-time suggestions for meeting facilitators
> - Risk flagging: highlight decisions that may conflict with existing governance or legal requirements

### Phase 4: Meeting Mode (5–6 weeks)

**Objective:** Support live meetings (in-person and online) with minimal friction, capturing decisions as a natural byproduct of facilitation.

**Meeting Setup**

- Create a meeting from proposals and topics: drag items into an agenda
- Assign time estimates and decision methods per agenda item
- Mark items as: for decision, for discussion, for information
- Share agenda link in advance

**Facilitator View**

- Single-screen facilitator interface: current agenda item, timer, proposal text, decision controls
- Move through agenda items sequentially
- Trigger decision method flows (consent round, vote, etc.)
- Capture decisions in real-time: outcome, conditions, next actions

**Participant View**

- Join via QR code or short link (no account required for observers)
- See current agenda item and proposal text
- Participate in: temperature checks, reactions, votes, objection rounds
- Request to speak / stack management

**Real-time Infrastructure**

- Socket.io or PartyKit for live state synchronisation
- Facilitator actions broadcast to all participants
- Works for in-person (one screen + devices), online (shared screen + devices), and hybrid

**Post-Meeting**

- Auto-generated meeting summary from structured data: attendance, agenda items, decisions, actions
- Shareable meeting record (link or PDF export)
- Decisions automatically added to the decision log
- Actions automatically created and assigned

> **🔌 MODULE: Advanced Meeting Flows**
>
> *Extended facilitation features for different meeting types and decision methods.*
>
> - Sociocratic circle meeting template: opening round, administrative, agenda building, consent decisions, closing round
> - Board meeting template: standing items, committee reports, decision items, AOB
> - Anonymous voting and objection options
> - Async decision mode: time-boxed proposals with notification-driven participation
> - Meeting recording integration: link audio/video recordings to specific agenda items
> - Accessibility features: screen reader support, high contrast mode, keyboard navigation

### Phase 5: SaaS Infrastructure & Scale (4–5 weeks)

**Objective:** Production-ready hosted service with billing, onboarding, and optional transparency features.

**Billing & Plans**

- Stripe integration for subscription billing
- Free tier: 1 space, limited history, core features
- Paid tier(s): multiple spaces, full history, AI features, meeting mode
- Charity/social enterprise pricing: discounted or grant-subsidised access

**Transparency Layer**

- Per-space setting: public decision log, public governance documents, or fully private
- Configurable: choose which decisions and documents are publicly visible
- Public-facing pages with clean, read-only presentation
- Embeddable decision log widget for organisation websites

**Onboarding & Support**

- Guided onboarding flow: create space, invite members, log first decision
- Interactive walkthrough of key concepts
- Help documentation and governance guides

**API & Integrations**

- REST API for programmatic access to decision log and governance documents
- Webhook support for decision events
- Export: PDF minutes, Word governance documents, CSV decision data
- Calendar integration for meeting scheduling and review reminders

> **🔌 MODULE: Ecosystem & Patterns**
>
> *Longer-term features for building a governance practice community.*
>
> - Governance pattern library: reusable governance structures and decision frameworks
> - Starter kits: pre-configured spaces for common organisational types (CIO charity, CIC, unincorporated group, partnership)
> - Community templates: organisations share their governance structures (anonymised)
> - Governance health benchmarking: compare patterns across similar organisations (anonymised, opt-in)
> - API marketplace: third-party integrations (accounting, HR, project management)
> - White-label option for infrastructure bodies supporting multiple organisations

---

## 6. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js (App Router) | Strong ecosystem, SSR for public pages, API routes for backend, familiar stack |
| Auth | Clerk | Managed auth with organisation/team support, generous free tier, handles invitations |
| Database | Neon (PostgreSQL) | Serverless Postgres, branching for development, generous free tier, scales with SaaS model |
| ORM | Drizzle | Type-safe, lightweight, good PostgreSQL support, works well with Neon |
| Real-time | Socket.io or PartyKit | Meeting mode requires live state sync. PartyKit (Cloudflare) is simpler; Socket.io more mature |
| Rich text editor | Tiptap (ProseMirror) | Block-based editing for governance documents, extensible, good collaboration support |
| AI | Anthropic API (Claude) | Structured output, good analytical reasoning, API-first integration |
| Hosting | Vercel | Natural fit for Next.js, edge functions, preview deployments |
| Payments | Stripe | Standard for SaaS billing, good subscription support |
| Email | Resend | Transactional email for notifications, invitations, digests |
| File storage | Vercel Blob or S3-compatible | Meeting attachments, document exports |
| Monitoring | Vercel Analytics + Sentry | Performance monitoring and error tracking |

### 6.1 Key Architecture Decisions

**Event-sourced decision model.** Decisions are stored as immutable events. Document state is computed from the decision trail. This makes the history reliable and the "why" always traceable, without requiring actual git infrastructure.

**Background AI processing.** AI analysis runs as background jobs, not in the user interaction flow. This keeps the interface fast and means AI features can be added or removed without affecting core functionality.

**Progressive enhancement for meetings.** Meeting mode is an enhancement, not a requirement. Organisations can use the platform purely for post-hoc decision logging and document management without ever using the live meeting features.

**Multi-tenant from day one.** Clerk organisations map to spaces. Row-level security in PostgreSQL ensures data isolation. This is essential for the SaaS model.

---

## 7. Indicative Timeline

Solo build, working approximately 3–4 days per week on this project:

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Phase 0: Design & Validate | Weeks 1–3 | Wireframes, validated user journeys, pilot org identified, name chosen |
| Phase 1: Core Decision Log | Weeks 4–9 | Usable decision log with meetings, actions, search. Pilot org onboarded. |
| Phase 2: Documents & Proposals | Weeks 10–14 | Governance documents with provenance, proposal workflow, discussion threads |
| Phase 3: AI Layer | Weeks 15–18 | Pattern analysis, review prompter, insights digest |
| Phase 4: Meeting Mode | Weeks 19–24 | Live meeting facilitation, real-time participation, auto-minutes |
| Phase 5: SaaS & Scale | Weeks 25–29 | Billing, transparency layer, onboarding, API |

Total estimated timeline: approximately 7 months to full feature set. Phase 1 produces a usable product. Each subsequent phase adds independent value.

Module features (AI advanced, templates library, advanced meeting flows, ecosystem) are additive and can be developed in parallel or deferred based on user feedback from pilot organisations.

---

## 8. Risks & Open Questions

### 8.1 Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Solo build pace | Phases slip, features cut | Strict prioritisation. Phase 1 is valuable alone. Cut scope before cutting quality. |
| Adoption friction | Organisations don't change behaviour | Design for post-hoc logging first (low friction). Meeting mode is enhancement, not prerequisite. |
| AI features feel gimmicky | Erodes trust in the platform | Ship core without AI. Add AI only when there's enough decision data to generate meaningful patterns. |
| Over-engineering the git metaphor | Users confused by version control concepts | Never expose git terminology. Version history is "what changed and why", not branches and merges. |
| Pricing sensitivity | Can't sustain SaaS revenue | Explore grant funding for development. Tiered pricing with meaningful free tier. Consider infrastructure body partnerships. |

### 8.2 Open Questions

- Project name: needs to be memorable, non-technical, and evoke transparency and collective memory
- Open source model: fully open core? Open source with proprietary AI layer? License choice (AGPL, MIT, BSL)?
- Pilot organisation: which type of org tests the widest range of features? Board-level or project-level governance?
- Offline/low-connectivity support: relevant for some contexts. Progressive web app caching sufficient?
- Integration priority: which existing tools (Google Workspace, Microsoft 365, Notion) should connect first?
- Accessibility requirements: WCAG 2.1 AA from Phase 1, or progressive enhancement?

---

## 9. Success Criteria

**Phase 1 success (minimum viable product):**

- 1 pilot organisation actively logging decisions after every meeting for 2+ months
- New member can find the history of any governance decision within 60 seconds
- Time from meeting to published decision record is under 10 minutes

**Phase 2–3 success (governance platform):**

- Governance documents have full provenance trail. "Why does this clause exist?" is always answerable.
- At least 30% of significant decisions receive a structured review within 6 months
- AI insights are rated as useful by pilot organisation members in at least 60% of cases

**Phase 4–5 success (product-market fit):**

- 3+ paying organisations outside the pilot
- Net Promoter Score above 40
- Meeting mode reduces post-meeting admin time by at least 50%

---

*This document is a living plan. It will be updated as design decisions are made and validated with pilot organisations.*
