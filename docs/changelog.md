# Changelog

All notable changes to Glade will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

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
