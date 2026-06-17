# Changelog

All notable changes to Glade will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [2026-06-17] — The Insights hub, tags everywhere, editable actions, and a richer Glade

### Added

- **Tag anything** — tags now work across decisions, proposals, actions, topics, documents, and meetings (previously only decisions and proposals). Add tags when you create or edit any of these, and narrow any of those lists to a single tag using the new filter bar at the top of the page.
- **Suggest tags with AI** — on the decision form, click "Suggest tags" and Glade picks the most relevant existing tags for what you've written (Canopy plan, AI enabled).
- **Edit actions** — actions can now be edited. Click the pencil on any action to change its description, owners, due date, and tags.
- **More than one owner per action** — an action can now have several owners, plus an optional free-text name for someone outside your space.
- **Record decisions and actions during a meeting** — the meeting form now has Decisions and Actions sections, so you can capture what was decided and what needs doing without leaving the page. And on a meeting's detail page, a new **New decision** button creates a decision and links it to the meeting in one step — no more hopping out to the decision log and back.
- **The Insights page** — a dedicated home for Glade's AI intelligence, reached from the sidebar, bringing pattern insights, the monthly digest archive, and member briefings together in one place.
- **Digest archive and comparison** — every monthly digest is now kept, so you can look back over time. Each new digest also compares the current period against the previous one.
- **Visual pattern insights** — pattern analysis now appears as a grid of cards, each with a category, a signal (strength, watch, or needs attention), and a suggested next step.
- **Download and print AI documents** — digests and briefings can be downloaded as Markdown or opened in a printable view to save as PDF.
- **Ask about your governance** — a question box on the dashboard answers plain-language questions about your decisions and documents, citing the decision numbers it drew on.
- **AI-drafted agendas** — when creating a meeting, click "AI draft agenda" to generate agenda items from your open proposals, topics, and recent decisions.
- **A more navigable Glade** — the decision canvas now supports click-and-drag panning, arrow-key navigation between decisions, a search box that jumps to a matching decision, and clickable legend filters to show or hide decisions by status.

### Changed

- **Clearer AI content** — briefings, digests, and answers now render tables, headings, and lists properly instead of showing raw text.
- **Tidier dashboard** — the AI panels moved off the cramped sidebar; quick questions stay on the dashboard while the longer reports (digests, briefings) now live on the Insights page.
- **Wider tag colour palette** — more colours to choose from when creating tags.

### Fixed

- **Notifications panel position** — the notifications dropdown no longer opens off the edge of the screen.

---

## [2026-03-04] — Account security, member invites, and branded emails

### Added

- **Password reset** — forgotten your password? Click "Forgot password?" on the sign-in page, enter your email, and you'll receive a secure link to set a new one.
- **Change your password** — a new "Your Account" section on the Settings page lets you change your password at any time. You'll need to enter your current password to confirm it's you.
- **Invite people who don't have an account yet** — admins can now invite anyone by email from the Members page. If they don't have a Glade account, they receive an invitation email with a sign-up link, and they're added to your space automatically as soon as they sign up or sign in.
- **"Check your email" page** — after requesting a magic link, you now see a friendly confirmation page telling you to check your inbox.

### Changed

- **Branded emails** — all emails from Glade (magic links, password resets, invitations, and added-to-space notifications) now share a consistent, recognisable Glade design.
- **Signing out** — clicking "Sign out" now shows a confirmation dialog instead of taking you to a separate page.

---

## [2026-03-03] — Proposals in agendas, transcript import, entity linking, and more

### Added

- **Proposals flow through meetings** — proposals can now be added directly to meeting agendas from the proposal detail page using the "Add to agenda" button. Draft proposals also appear in the meeting form proposal picker. During a live meeting, proposal-backed agenda items automatically start the appropriate decision flow, pre-populated with the proposal's suggested method and text. The proposal's rationale is shown to the facilitator during the discussion. When the decision is recorded, the proposal is automatically marked as "Decided" and linked to the new decision.
- **Meeting transcript import** — paste or upload a meeting transcript, and Glade uses AI to extract decisions, actions, and topics. Review the extracted items before importing them into a new or existing meeting record.
- **Link entities to meetings** — connect decisions, documents, and proposals to meeting records using the new linking interface on meeting detail pages. Linked entities appear on meeting summaries, making it easy to trace what was discussed where.
- **Actions on proposals and topics** — actions are no longer limited to decisions. You can now add follow-up actions directly on proposals and topics, and create actions from the actions tracker page itself.
- **Delete anything** — decisions, meetings, proposals, topics, and documents can now be deleted. All deletions are logged to an audit trail visible in Settings, with a snapshot of what was removed.
- **Facilitator assignment** — when creating or editing a meeting, you can assign a specific member as facilitator. The facilitator sees the full control panel during live meetings.
- **Decision flow method selector** — the facilitator can now choose a decision method (consent, vote, advice, delegation, lazy consensus) before starting a flow, and navigate back between flow stages.
- **Super admin panel** — space plan management for platform administrators.

### Changed

- **Meeting form proposal picker** — the "Add proposal" button is now always visible (disabled with a hint when no proposals are available), and draft proposals are included alongside those open for discussion or ready for decision.
- **Meeting summary** — now shows linked actions, documents, and proposals alongside decisions.

### Fixed

- **Live meeting stability** — fixed a crash when resuming a meeting with missing session state, and resolved an issue where the page could error during rendering.
- **Magic link emails** — sign-in emails now send from the correct ourglade.app domain.
- **AI responses** — code fences are stripped from AI-generated content so it displays cleanly.
- **Plan changes** — upgrading or changing your plan now refreshes the interface immediately.
- **Public Glade page** — fixed a rendering glitch on the public canvas page.

---

## [2026-03-03] — Initial documentation

### Added

- **Public-by-default governance items** — when a space enables public visibility for a section, new items in that section are now public by default. You can still hide individual items using the "Hide from public page" checkbox.
- **Per-section public pages** — each governance area (decisions, actions, meetings, documents, proposals, topics, and The Glade) now has its own dedicated public page at `/public/your-space/section`. Share direct links to exactly the part of your governance record you want people to see.
- **Shareable links in settings** — when public visibility is enabled, the Settings page shows copyable URLs for each public section.
- **Embeddable decision log** — embed a compact version of your public decision log on your organisation's website using a simple iframe snippet (shown in Settings when the decision log is public).
- **Accessibility improvements** — skip-to-content link, proper landmark regions, form error labelling, icon button labels, keyboard navigation throughout, and screen reader announcements during live meetings.
- **Reduced motion support** — The Glade canvas respects your system's "reduce motion" preference, disabling animations when set.
- **Colour contrast improvements** — muted text and status indicators now meet WCAG AA contrast requirements.
- **Live meeting announcements** — screen reader users hear agenda item changes and decision flow stage transitions announced automatically during live meetings.
- **Canvas accessibility** — The Glade canvas now includes a text description for screen readers, keyboard-focusable nodes, and zoom change announcements.
- **Accessibility linting** — development tooling now catches common accessibility issues automatically.

### Changed

- **Decision queries use safer database patterns** — internal improvement to how public decisions are fetched, with no visible change to users.
