# Accessibility (WCAG 2.1 AA) & Integrations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring Glade to WCAG 2.1 AA compliance and add calendar integrations (Google Workspace, Microsoft 365) plus Notion document import.

**Architecture:** Accessibility work is a horizontal pass across existing components — no new pages, just improving what's there. Integrations add new server actions and a thin client layer. Calendar sync uses Google Calendar API and Microsoft Graph API via OAuth scope extension. Notion import uses the Notion API to pull pages and convert blocks to Tiptap JSON.

**Tech Stack:** No new UI libraries. New deps: `googleapis` (Google Calendar), `@microsoft/microsoft-graph-client` (Outlook), `@notionhq/client` (Notion import). New dev dep: `eslint-plugin-jsx-a11y`.

---

## Part A: Accessibility (WCAG 2.1 AA)

Current state: ~55% compliant. Good foundation (semantic HTML, focus-visible rings, status text+colour, form labels). Critical gaps: no skip link, no aria-live regions, no screen reader announcements for dynamic content, icon-only buttons missing labels, form errors not announced, space switcher not keyboard-navigable.

### Task 1: Accessibility utilities and skip link

**Files:**
- Create: `src/components/skip-link.tsx`
- Create: `src/components/screen-reader-only.tsx`
- Create: `src/components/live-region.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/app-shell.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: Create the ScreenReaderOnly component**

```tsx
// src/components/screen-reader-only.tsx
export function ScreenReaderOnly({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
}
```

**Step 2: Add `.sr-only` utility to globals.css**

Add after the `:focus-visible` rule in `src/app/globals.css`:

```css
/* Screen reader only — visible to assistive tech, hidden visually */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

**Step 3: Create the SkipLink component**

```tsx
// src/components/skip-link.tsx
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-canopy focus:text-paper focus:rounded-lg focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-canopy focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
}
```

Note: `focus:not-sr-only` requires a custom utility. Add to globals.css:

```css
.focus\:not-sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: revert;
  margin: revert;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

**Step 4: Create the LiveRegion component**

A reusable aria-live announcer for dynamic content changes.

```tsx
// src/components/live-region.tsx
"use client";

import { useState, useCallback, createContext, useContext } from "react";

interface LiveRegionContextValue {
  announce: (message: string, priority?: "polite" | "assertive") => void;
}

const LiveRegionContext = createContext<LiveRegionContextValue>({
  announce: () => {},
});

export function useLiveRegion() {
  return useContext(LiveRegionContext);
}

export function LiveRegionProvider({ children }: { children: React.ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");

  const announce = useCallback((message: string, priority: "polite" | "assertive" = "polite") => {
    if (priority === "assertive") {
      setAssertiveMessage("");
      // Force re-render so screen reader re-announces
      requestAnimationFrame(() => setAssertiveMessage(message));
    } else {
      setPoliteMessage("");
      requestAnimationFrame(() => setPoliteMessage(message));
    }
  }, []);

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {politeMessage}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {assertiveMessage}
      </div>
    </LiveRegionContext.Provider>
  );
}
```

**Step 5: Wire skip link and LiveRegionProvider into the app**

In `src/components/app-shell.tsx`, add the skip link and wrap content in LiveRegionProvider. Add `id="main-content"` to the `<main>` element:

```tsx
import { SkipLink } from "./skip-link";
import { LiveRegionProvider } from "./live-region";

export function AppShell({ children, currentSpace, userSpaces }: AppShellProps) {
  return (
    <LiveRegionProvider>
      <SkipLink />
      <div className="flex flex-col md:flex-row h-screen overflow-hidden">
        <MobileNav currentSpace={currentSpace} userSpaces={userSpaces} />
        <div className="hidden md:flex">
          <Sidebar currentSpace={currentSpace} userSpaces={userSpaces} />
        </div>
        <main id="main-content" className="flex-1 overflow-y-auto" tabIndex={-1}>
          {children}
        </main>
        <Walkthrough />
      </div>
    </LiveRegionProvider>
  );
}
```

In `src/app/layout.tsx`, change `lang="en"` to `lang="en-GB"` since the app uses en-GB locale for dates.

**Step 6: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 7: Commit**

```bash
git add src/components/skip-link.tsx src/components/screen-reader-only.tsx src/components/live-region.tsx src/app/globals.css src/components/app-shell.tsx src/app/layout.tsx
git commit -m "feat(a11y): add skip link, screen reader utilities, and live region announcer"
```

---

### Task 2: Landmark roles and heading hierarchy

**Files:**
- Modify: `src/components/sidebar.tsx`
- Modify: `src/components/mobile-nav.tsx`
- Modify: `src/components/breadcrumbs.tsx`
- Modify: `src/components/app-shell.tsx`

**Step 1: Add aria-label to sidebar nav**

In `src/components/sidebar.tsx`, the `<nav>` element on line 150 needs a label:

```tsx
<nav aria-label="Main navigation" className="flex-1 px-2 py-3 space-y-0.5">
```

Add `aria-current="page"` to active nav links. In the nav item Link (line 158):

```tsx
<Link
  key={item.href}
  href={item.href}
  data-walkthrough={item.walkthrough}
  aria-current={isActive ? "page" : undefined}
  className={cn(/* ... existing classes ... */)}
>
```

Do the same for BOTTOM_ITEMS links and the sign-out link.

Add `aria-label` to the sidebar collapse button (line 215):

```tsx
<button
  onClick={() => setCollapsed(!collapsed)}
  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
  className="..."
>
```

Add `aria-expanded` and `aria-label` to the space switcher button (line 83):

```tsx
<button
  onClick={() => setSpaceSwitcherOpen(!spaceSwitcherOpen)}
  aria-expanded={spaceSwitcherOpen}
  aria-label="Switch space"
  className="..."
>
```

**Step 2: Same fixes for mobile-nav.tsx**

In `src/components/mobile-nav.tsx`:
- Add `aria-label="Main navigation"` to the `<nav>` element (line 81)
- Add `aria-current="page"` to active links
- Add `aria-expanded={spaceSwitcherOpen}` to the space switcher button
- Add `aria-expanded={open}` to the hamburger menu button (line 70)

**Step 3: Add breadcrumb accessibility**

In `src/components/breadcrumbs.tsx`:
- Add `aria-label="Breadcrumb"` to the `<nav>` element
- Wrap the list in an `<ol>` with items as `<li>`
- Add `aria-current="page"` to the last crumb

```tsx
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8">
      <ol className="flex items-center gap-1.5 text-xs text-bark-muted">
        {items.map((crumb, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={12} className="text-bark-muted/50" aria-hidden="true" />}
              {isLast || !crumb.href ? (
                <span className="truncate max-w-[200px]" aria-current={isLast ? "page" : undefined}>
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="hover:text-canopy transition-colors">
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

**Step 4: Add role to sidebar `<aside>`**

The `<aside>` in sidebar.tsx already implies `complementary` role. Add an `aria-label`:

```tsx
<aside aria-label="Sidebar" className={cn(...)}>
```

**Step 5: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/components/sidebar.tsx src/components/mobile-nav.tsx src/components/breadcrumbs.tsx
git commit -m "feat(a11y): add landmark labels, aria-current, breadcrumb semantics"
```

---

### Task 3: Form accessibility — error announcements and field linking

**Files:**
- Create: `src/components/form-error.tsx`
- Modify: `src/app/(app)/decisions/decision-form.tsx`
- Modify: `src/app/(app)/documents/document-form.tsx`
- Modify: `src/app/(app)/meetings/meeting-form.tsx`
- Modify: `src/app/(app)/proposals/proposal-form.tsx`
- Modify: `src/app/(app)/topics/topic-form.tsx`
- Modify: `src/app/(auth)/sign-in/page.tsx`
- Modify: `src/app/(auth)/sign-up/page.tsx`
- Modify: `src/app/(auth)/new-space/page.tsx`

**Step 1: Create a shared FormError component**

```tsx
// src/components/form-error.tsx
"use client";

import { useEffect, useRef } from "react";

export function FormError({ message }: { message: string | null }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && ref.current) {
      ref.current.focus();
    }
  }, [message]);

  if (!message) return null;

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="mb-6 px-4 py-3 rounded-lg bg-earth/8 border border-earth/20 text-sm text-earth"
    >
      {message}
    </div>
  );
}
```

**Step 2: Replace all inline error divs with `<FormError>`**

Find every `{error && (<div className="mb-6 px-4 py-3 rounded-lg bg-earth/8 ...">` pattern and replace with `<FormError message={error} />`.

This applies to at least 8 files (listed above). Each replacement is identical:

Before:
```tsx
{error && (
  <div className="mb-6 px-4 py-3 rounded-lg bg-earth/8 border border-earth/20 text-sm text-earth">
    {error}
  </div>
)}
```

After:
```tsx
<FormError message={error} />
```

For `sign-in/page.tsx`, the error mapping logic moves into the component:
```tsx
<FormError message={error === "CredentialsSignin" ? "Invalid email or password" : error ? "Something went wrong. Please try again." : null} />
```

**Step 3: Add `aria-required` to required form fields**

In each form component, add `aria-required="true"` to fields that have `required` attribute. Example pattern:

```tsx
<input
  type="text"
  id="title"
  required
  aria-required="true"
  className={inputClass}
  ...
/>
```

Apply to all title, date, and other required fields across all forms.

**Step 4: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/form-error.tsx src/app
git commit -m "feat(a11y): accessible form errors with role=alert, aria-required on fields"
```

---

### Task 4: Icon-only button labels

**Files:**
- Modify: `src/app/(app)/glade/glade-canvas.tsx`
- Modify: `src/app/(app)/decisions/decision-list.tsx`
- Modify: `src/app/(app)/decisions/[number]/page.tsx`
- Modify: `src/components/tiptap-editor.tsx`
- Modify: any other files with icon-only buttons

**Step 1: Audit all icon-only buttons**

Search for pattern: buttons containing only an Icon component with no text. Each needs an `aria-label`.

Canvas zoom buttons — in `glade-canvas.tsx`, find buttons with `ZoomIn`, `ZoomOut`, `Maximize2`:
```tsx
<button aria-label="Zoom in" ...><ZoomIn size={16} /></button>
<button aria-label="Zoom out" ...><ZoomOut size={16} /></button>
<button aria-label="Reset zoom" ...><Maximize2 size={16} /></button>
```

These may already have labels (the audit found some). Verify and add any missing.

**Step 2: Tiptap editor toolbar buttons**

In `src/components/tiptap-editor.tsx`, toolbar buttons use `title` but not `aria-label`. Add `aria-label` matching the title:

```tsx
<button
  onClick={() => editor.chain().focus().toggleBold().run()}
  title="Bold"
  aria-label="Bold"
  className={...}
>
```

Apply to all toolbar buttons: Bold, Italic, Underline, Heading 1/2/3, Bullet List, Ordered List, Link, Horizontal Rule.

Also replace `window.prompt()` for the link dialog with an accessible input. Create an inline input that appears below the toolbar:

```tsx
// When link button clicked, show an input field instead of window.prompt()
const [showLinkInput, setShowLinkInput] = useState(false);
const [linkUrl, setLinkUrl] = useState("");
const linkInputRef = useRef<HTMLInputElement>(null);

// In the toolbar, after the link button:
{showLinkInput && (
  <div className="flex items-center gap-2 px-2 py-1.5 border-t border-border">
    <label htmlFor="tiptap-link-url" className="sr-only">URL</label>
    <input
      ref={linkInputRef}
      id="tiptap-link-url"
      type="url"
      placeholder="https://..."
      value={linkUrl}
      onChange={(e) => setLinkUrl(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") { applyLink(); }
        if (e.key === "Escape") { setShowLinkInput(false); }
      }}
      className="flex-1 px-2 py-1 text-sm border border-border rounded"
    />
    <button onClick={applyLink} aria-label="Apply link" className="text-sm text-canopy">Apply</button>
    <button onClick={() => setShowLinkInput(false)} aria-label="Cancel" className="text-sm text-bark-muted">Cancel</button>
  </div>
)}
```

**Step 3: Decision list filter buttons**

In `src/app/(app)/decisions/decision-list.tsx`, find any X/close/clear buttons used for clearing filters and add `aria-label="Clear filter"` or similar.

**Step 4: Add `aria-hidden="true"` to decorative icons**

Icons next to text labels are decorative. Add `aria-hidden="true"` to prevent screen readers double-announcing. Pattern:

```tsx
<Icon size={17} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
```

Apply this in sidebar nav items (both `sidebar.tsx` and `mobile-nav.tsx`) since the text label already identifies the link.

**Step 5: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/components/tiptap-editor.tsx src/app src/components/sidebar.tsx src/components/mobile-nav.tsx
git commit -m "feat(a11y): aria-labels on icon buttons, accessible link input in editor"
```

---

### Task 5: Keyboard navigation for space switcher dropdown

**Files:**
- Modify: `src/components/sidebar.tsx`
- Modify: `src/components/mobile-nav.tsx`

**Step 1: Add keyboard handling to space switcher in sidebar.tsx**

The space switcher dropdown needs: Escape to close, Arrow keys to navigate, Enter to select, click-outside to close.

Add a ref for the dropdown container, a `useEffect` for click-outside, and keyboard event handling:

```tsx
const dropdownRef = useRef<HTMLDivElement>(null);
const [focusedIndex, setFocusedIndex] = useState(-1);

// Close on outside click
useEffect(() => {
  if (!spaceSwitcherOpen) return;
  function handleClick(e: MouseEvent) {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setSpaceSwitcherOpen(false);
    }
  }
  document.addEventListener("mousedown", handleClick);
  return () => document.removeEventListener("mousedown", handleClick);
}, [spaceSwitcherOpen]);

// Keyboard navigation on the trigger button
function handleDropdownKeyDown(e: React.KeyboardEvent) {
  if (!spaceSwitcherOpen) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSpaceSwitcherOpen(true);
      setFocusedIndex(0);
    }
    return;
  }

  const itemCount = userSpaces.length + 1; // spaces + "Create new"
  switch (e.key) {
    case "Escape":
      e.preventDefault();
      setSpaceSwitcherOpen(false);
      break;
    case "ArrowDown":
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % itemCount);
      break;
    case "ArrowUp":
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + itemCount) % itemCount);
      break;
    case "Enter":
    case " ":
      e.preventDefault();
      // Trigger the focused item's action
      if (focusedIndex < userSpaces.length) {
        const space = userSpaces[focusedIndex];
        setSpaceSwitcherOpen(false);
        if (space.slug !== currentSpace.slug) switchSpace(space.slug);
      }
      break;
  }
}
```

Add `role="listbox"` to the dropdown div, `role="option"` to each space button, and `aria-selected` for the current space. Use `data-focused` or a ref to scroll focused items into view.

**Step 2: Same treatment for mobile-nav space switcher**

Apply the same keyboard handling pattern to the mobile nav space switcher.

**Step 3: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/sidebar.tsx src/components/mobile-nav.tsx
git commit -m "feat(a11y): keyboard navigation for space switcher dropdown"
```

---

### Task 6: Live meeting aria-live announcements

**Files:**
- Modify: `src/app/(app)/meetings/[id]/live/facilitator-view.tsx`
- Modify: `src/app/(app)/meetings/[id]/live/participant-view.tsx`
- Modify: `src/app/(app)/meetings/[id]/live/consent-flow.tsx`
- Modify: `src/app/(app)/meetings/[id]/live/vote-flow.tsx`
- Modify: `src/app/(app)/meetings/[id]/live/timer.tsx`
- Modify: any other live meeting flow components

**Step 1: Add live region announcements to flow stage changes**

In each decision flow component (consent-flow, vote-flow, etc.), import `useLiveRegion` and announce stage transitions:

```tsx
import { useLiveRegion } from "@/components/live-region";

// Inside the component:
const { announce } = useLiveRegion();

// When stage changes:
useEffect(() => {
  if (flow?.stage) {
    const stageLabels: Record<string, string> = {
      present: "Presenting proposal",
      clarify: "Clarifying questions",
      react: "Reactions round",
      object: "Objection round",
      integrate: "Integration",
      decide: "Decision",
    };
    announce(stageLabels[flow.stage] || flow.stage);
  }
}, [flow?.stage, announce]);
```

**Step 2: Announce vote results**

When a vote completes, announce the result:

```tsx
// In vote-flow.tsx, when results are displayed:
useEffect(() => {
  if (showResults) {
    const total = votesFor + votesAgainst + votesAbstain;
    announce(`Vote complete. ${votesFor} for, ${votesAgainst} against, ${votesAbstain} abstain out of ${total} votes.`);
  }
}, [showResults, votesFor, votesAgainst, votesAbstain, announce]);
```

**Step 3: Timer announcements**

In the timer component, announce when timer hits key milestones (not every second — that would be annoying):

```tsx
// Announce when timer reaches 1 minute remaining and when it expires
useEffect(() => {
  if (remainingSeconds === 60) {
    announce("One minute remaining");
  } else if (remainingSeconds === 0) {
    announce("Time is up", "assertive");
  }
}, [remainingSeconds, announce]);
```

**Step 4: Announce agenda item transitions**

In the facilitator view, when advancing to a new agenda item:

```tsx
useEffect(() => {
  if (currentItem) {
    announce(`Now discussing: ${currentItem.title}`);
  }
}, [currentItem?.id, announce]);
```

**Step 5: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/app/(app)/meetings/[id]/live/
git commit -m "feat(a11y): aria-live announcements for live meeting state changes"
```

---

### Task 7: Colour contrast fixes

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Verify and fix `bark-muted` contrast**

Current `bark-muted` is `oklch(0.50 0.015 55)`. On `paper-warm` (`oklch(0.95 0.012 75)`) this gives roughly 4.5:1 — borderline for AA normal text.

Darken `bark-muted` slightly to ensure it passes everywhere:

```css
--color-bark-muted: oklch(0.45 0.015 55);  /* was 0.50, now 0.45 for better contrast */
```

This gives ~5.5:1 on paper-warm and ~4.8:1 on paper-deep — both comfortably AA.

**Step 2: Verify status colour contrast**

Status colours are used as text on light backgrounds (e.g. `text-status-decided` on `bg-status-decided/10`). These are mostly used in pills where the text is the status label — the coloured text on a tinted background.

Check each:
- `sky` (0.55) on `sky/10` — likely fails. Darken sky text: `oklch(0.45 0.10 240)`
- `earth` (0.55) on `earth/8` — likely borderline. Darken: `oklch(0.45 0.07 45)`
- `status-decided` and `status-learned` follow sky/earth — update them in tandem

If status pills use coloured backgrounds with dark text instead, contrast is fine. Verify the actual pattern before changing.

**Step 3: Verify `canopy` link colour**

`canopy` (oklch(0.38 0.08 155)) on `paper` (oklch(0.97 0.008 80)) — this is very dark green, ~7:1 contrast. Should pass easily.

**Step 4: Run build to verify nothing visual broke**

Run: `npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "fix(a11y): improve colour contrast for muted text and status indicators"
```

---

### Task 8: Glade canvas accessibility

**Files:**
- Modify: `src/app/(app)/glade/glade-canvas.tsx`

**Step 1: Add SVG accessibility**

Add `<title>` and `<desc>` elements to the SVG, plus `role="img"` and `aria-labelledby`:

```tsx
<svg
  role="img"
  aria-labelledby="glade-canvas-title glade-canvas-desc"
  // ... existing props
>
  <title id="glade-canvas-title">Decision relationship canvas</title>
  <desc id="glade-canvas-desc">
    Visual map showing {decisions.length} decisions and their connections
  </desc>
  {/* ... existing SVG content */}
</svg>
```

**Step 2: Add an accessible alternative view**

Below the canvas, add a text-based summary that screen readers can access:

```tsx
<div className="sr-only" role="region" aria-label="Decision relationships summary">
  <h2>Decision relationships</h2>
  <ul>
    {decisions.map((d) => (
      <li key={d.id}>
        Decision #{d.number}: {d.title} — {d.status}
        {d.links?.length > 0 && (
          <ul>
            {d.links.map((link) => (
              <li key={link.id}>{link.type} Decision #{link.number}</li>
            ))}
          </ul>
        )}
      </li>
    ))}
  </ul>
</div>
```

**Step 3: Announce zoom level changes**

```tsx
const { announce } = useLiveRegion();

function handleZoomIn() {
  const newZoom = Math.min(zoom + 0.2, 3);
  setZoom(newZoom);
  announce(`Zoom ${Math.round(newZoom * 100)}%`);
}
```

**Step 4: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/(app)/glade/glade-canvas.tsx
git commit -m "feat(a11y): accessible canvas with SVG title, text alternative, zoom announcements"
```

---

### Task 9: Add eslint-plugin-jsx-a11y

**Files:**
- Modify: `package.json`
- Modify: `eslint.config.mjs`

**Step 1: Install the plugin**

Run: `npm install --save-dev eslint-plugin-jsx-a11y`

**Step 2: Add to ESLint config**

In `eslint.config.mjs`, add the jsx-a11y recommended rules. The exact shape depends on the existing config (Next.js uses flat config). Likely:

```js
import jsxA11y from "eslint-plugin-jsx-a11y";

// Add to the config array:
jsxA11y.flatConfigs.recommended,
```

**Step 3: Run lint and fix any new violations**

Run: `npm run lint`
Expected: May surface new warnings. Fix the most critical ones (missing alt text, missing labels). Less critical ones can be addressed incrementally.

**Step 4: Commit**

```bash
git add package.json package-lock.json eslint.config.mjs
git commit -m "chore: add eslint-plugin-jsx-a11y for accessibility linting"
```

---

### Task 10: Reduce motion support

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add prefers-reduced-motion media query**

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .root-pulse {
    animation: none;
  }
}
```

**Step 2: Run build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(a11y): respect prefers-reduced-motion for animations and transitions"
```

---

## Part B: Google Calendar Integration

### Task 11: Add Google Calendar OAuth scope and token storage

**Files:**
- Modify: `src/lib/auth.config.ts`
- Modify: `src/lib/auth.ts`
- Modify: `src/db/schema.ts`
- Modify: `.env.example`

**Step 1: Extend Google OAuth with calendar scope**

In `src/lib/auth.config.ts`, modify the Google provider:

```tsx
Google({
  clientId: process.env.AUTH_GOOGLE_ID,
  clientSecret: process.env.AUTH_GOOGLE_SECRET,
  authorization: {
    params: {
      scope: "openid profile email https://www.googleapis.com/auth/calendar.events",
      access_type: "offline",
      prompt: "consent",
    },
  },
}),
```

The `calendar.events` scope allows creating and reading events. `access_type: "offline"` requests a refresh token. `prompt: "consent"` ensures the refresh token is returned.

**Step 2: Ensure tokens are stored in the accounts table**

The `accounts` table already has `access_token`, `refresh_token`, and `expires_at` columns (from NextAuth Drizzle adapter). These are populated automatically by NextAuth during OAuth sign-in.

No schema change needed for token storage — NextAuth stores them.

**Step 3: Add a helper to get Google access token for a user**

Create `src/lib/google-calendar.ts`:

```tsx
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const account = await db.query.accounts.findFirst({
    where: and(
      eq(accounts.userId, userId),
      eq(accounts.provider, "google")
    ),
  });

  if (!account?.access_token) return null;

  // Check if token is expired
  if (account.expires_at && account.expires_at * 1000 < Date.now()) {
    // Refresh the token
    if (!account.refresh_token) return null;

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();

    // Update stored token
    await db
      .update(accounts)
      .set({
        access_token: data.access_token,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      })
      .where(
        and(
          eq(accounts.userId, userId),
          eq(accounts.provider, "google")
        )
      );

    return data.access_token;
  }

  return account.access_token;
}
```

**Step 4: Update `.env.example`**

Add a comment about the Google OAuth scope change:

```bash
# Google OAuth — calendar.events scope requested for calendar integration
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
```

**Step 5: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/auth.config.ts src/lib/google-calendar.ts .env.example
git commit -m "feat: extend Google OAuth with calendar scope and token refresh"
```

---

### Task 12: Google Calendar create/sync server actions

**Files:**
- Create: `src/lib/calendar-actions.ts`
- Modify: `src/db/schema.ts` (add `externalCalendarEventId` to meetings)
- Modify: `src/lib/meeting-actions.ts`

**Step 1: Add `externalCalendarEventId` column to meetings**

In `src/db/schema.ts`, add to the meetings table:

```tsx
externalCalendarEventId: varchar("external_calendar_event_id", { length: 500 }),
```

**Step 2: Apply migration to Neon**

Write a temp migration script:

```js
// run-migration.cjs
const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });
const sql = neon(process.env.DATABASE_URL);
async function main() {
  await sql.query("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS external_calendar_event_id VARCHAR(500)");
  console.log("Done");
}
main();
```

Run: `node run-migration.cjs`
Then delete the script.

**Step 3: Create calendar server actions**

```tsx
// src/lib/calendar-actions.ts
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getGoogleAccessToken } from "./google-calendar";
import { getMeetingById } from "./queries";

export async function createGoogleCalendarEvent(meetingId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const token = await getGoogleAccessToken(session.user.id);
  if (!token) return { error: "Google Calendar not connected. Sign in with Google to enable." };

  const meeting = await getMeetingById(meetingId);
  if (!meeting) return { error: "Meeting not found" };

  // Build event body
  const event = {
    summary: meeting.title,
    description: `Glade meeting: ${meeting.title}\n\nType: ${meeting.type || "General"}\n\nView in Glade: ${process.env.NEXT_PUBLIC_APP_URL || ""}/meetings/${meetingId}`,
    start: {
      dateTime: new Date(meeting.date).toISOString(),
      timeZone: "Europe/London",
    },
    end: {
      // Default 1 hour duration — could sum agenda durations later
      dateTime: new Date(new Date(meeting.date).getTime() + 60 * 60 * 1000).toISOString(),
      timeZone: "Europe/London",
    },
    // Include attendee emails if available
    ...(meeting.attendees?.length && {
      attendees: meeting.attendees
        .filter((a: { email?: string }) => a.email)
        .map((a: { email: string }) => ({ email: a.email })),
    }),
  };

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Google Calendar API error:", error);
    return { error: "Failed to create calendar event" };
  }

  const data = await response.json();

  // Store the event ID on the meeting
  await db.update(meetings).set({
    externalCalendarEventId: data.id,
  }).where(eq(meetings.id, meetingId));

  return { success: true, eventUrl: data.htmlLink };
}

export async function deleteGoogleCalendarEvent(meetingId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const token = await getGoogleAccessToken(session.user.id);
  if (!token) return { error: "Google Calendar not connected" };

  const meeting = await getMeetingById(meetingId);
  if (!meeting?.externalCalendarEventId) return { error: "No calendar event linked" };

  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${meeting.externalCalendarEventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  await db.update(meetings).set({
    externalCalendarEventId: null,
  }).where(eq(meetings.id, meetingId));

  return { success: true };
}
```

**Step 4: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/calendar-actions.ts src/db/schema.ts
git commit -m "feat: Google Calendar event create/delete server actions"
```

---

### Task 13: Calendar sync UI on meeting detail page

**Files:**
- Create: `src/app/(app)/meetings/[id]/calendar-sync.tsx`
- Modify: `src/app/(app)/meetings/[id]/page.tsx`

**Step 1: Create CalendarSync client component**

```tsx
// src/app/(app)/meetings/[id]/calendar-sync.tsx
"use client";

import { useState } from "react";
import { Calendar, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { createGoogleCalendarEvent, deleteGoogleCalendarEvent } from "@/lib/calendar-actions";

interface CalendarSyncProps {
  meetingId: string;
  externalCalendarEventId: string | null;
  hasGoogleAccount: boolean;
}

export function CalendarSync({ meetingId, externalCalendarEventId, hasGoogleAccount }: CalendarSyncProps) {
  const [syncing, setSyncing] = useState(false);
  const [eventUrl, setEventUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(!!externalCalendarEventId);

  if (!hasGoogleAccount) {
    return (
      <div className="text-xs text-bark-muted">
        Sign in with Google to sync meetings to your calendar.
      </div>
    );
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    const result = await createGoogleCalendarEvent(meetingId);
    setSyncing(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSynced(true);
      setEventUrl(result.eventUrl || null);
    }
  }

  async function handleRemove() {
    setSyncing(true);
    setError(null);
    const result = await deleteGoogleCalendarEvent(meetingId);
    setSyncing(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSynced(false);
      setEventUrl(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {synced ? (
        <>
          <span className="text-xs text-canopy flex items-center gap-1">
            <Calendar size={13} aria-hidden="true" />
            Synced to Google Calendar
          </span>
          {eventUrl && (
            <a href={eventUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-canopy hover:underline">
              <ExternalLink size={12} aria-hidden="true" />
              <span className="sr-only">Open in Google Calendar</span>
            </a>
          )}
          <button onClick={handleRemove} disabled={syncing} aria-label="Remove from Google Calendar" className="text-xs text-bark-muted hover:text-earth">
            {syncing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          </button>
        </>
      ) : (
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 text-xs text-bark-muted hover:text-canopy transition-colors"
        >
          {syncing ? <Loader2 size={13} className="animate-spin" /> : <Calendar size={13} aria-hidden="true" />}
          Add to Google Calendar
        </button>
      )}
      {error && <span className="text-xs text-earth" role="alert">{error}</span>}
    </div>
  );
}
```

**Step 2: Add CalendarSync to meeting detail page**

In `src/app/(app)/meetings/[id]/page.tsx`, import and render CalendarSync in the meeting header area, passing `meetingId`, `externalCalendarEventId`, and whether the user has a Google account linked.

Query for the user's Google account:
```tsx
const session = await auth();
const googleAccount = session?.user?.id
  ? await db.query.accounts.findFirst({
      where: and(eq(accounts.userId, session.user.id), eq(accounts.provider, "google")),
    })
  : null;

// In the JSX:
<CalendarSync
  meetingId={meeting.id}
  externalCalendarEventId={meeting.externalCalendarEventId}
  hasGoogleAccount={!!googleAccount}
/>
```

**Step 3: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/app/(app)/meetings/[id]/calendar-sync.tsx src/app/(app)/meetings/[id]/page.tsx
git commit -m "feat: calendar sync UI on meeting detail page"
```

---

## Part C: Microsoft 365 / Outlook Calendar Integration

### Task 14: Microsoft Graph calendar integration

**Files:**
- Modify: `src/lib/auth.config.ts`
- Create: `src/lib/microsoft-calendar.ts`
- Modify: `src/lib/calendar-actions.ts`
- Modify: `src/app/(app)/meetings/[id]/calendar-sync.tsx`

**Step 1: Extend Microsoft OAuth with calendar scope**

In `src/lib/auth.config.ts`:

```tsx
MicrosoftEntraId({
  clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
  clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
  issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
  authorization: {
    params: {
      scope: "openid profile email Calendars.ReadWrite offline_access",
    },
  },
}),
```

**Step 2: Create Microsoft token helper**

```tsx
// src/lib/microsoft-calendar.ts
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function getMicrosoftAccessToken(userId: string): Promise<string | null> {
  const account = await db.query.accounts.findFirst({
    where: and(
      eq(accounts.userId, userId),
      eq(accounts.provider, "microsoft-entra-id")
    ),
  });

  if (!account?.access_token) return null;

  if (account.expires_at && account.expires_at * 1000 < Date.now()) {
    if (!account.refresh_token) return null;

    const response = await fetch(
      `${process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
          client_secret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
          grant_type: "refresh_token",
          refresh_token: account.refresh_token,
          scope: "Calendars.ReadWrite offline_access",
        }),
      }
    );

    if (!response.ok) return null;
    const data = await response.json();

    await db
      .update(accounts)
      .set({
        access_token: data.access_token,
        refresh_token: data.refresh_token || account.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      })
      .where(
        and(
          eq(accounts.userId, userId),
          eq(accounts.provider, "microsoft-entra-id")
        )
      );

    return data.access_token;
  }

  return account.access_token;
}
```

**Step 3: Add Microsoft calendar actions to `calendar-actions.ts`**

Add `createOutlookCalendarEvent` and `deleteOutlookCalendarEvent` using Microsoft Graph API (`https://graph.microsoft.com/v1.0/me/events`).

Same pattern as Google but with Microsoft Graph JSON shape:
```json
{
  "subject": "Meeting title",
  "body": { "contentType": "HTML", "content": "..." },
  "start": { "dateTime": "...", "timeZone": "Europe/London" },
  "end": { "dateTime": "...", "timeZone": "Europe/London" },
  "attendees": [{ "emailAddress": { "address": "...", "name": "..." } }]
}
```

**Step 4: Update CalendarSync component**

Add a second button for Outlook calendar. Show whichever calendar provider(s) the user has connected:

```tsx
{hasGoogleAccount && !synced && (
  <button onClick={handleGoogleSync}>Add to Google Calendar</button>
)}
{hasMicrosoftAccount && !synced && (
  <button onClick={handleOutlookSync}>Add to Outlook Calendar</button>
)}
```

Pass `hasMicrosoftAccount` from the server component.

**Step 5: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/auth.config.ts src/lib/microsoft-calendar.ts src/lib/calendar-actions.ts src/app/(app)/meetings/[id]/calendar-sync.tsx
git commit -m "feat: Microsoft Outlook calendar integration via Graph API"
```

---

## Part D: Notion Import

### Task 15: Notion API integration

**Files:**
- Create: `src/lib/notion-import.ts`
- Create: `src/lib/notion-actions.ts`
- Modify: `.env.example`

**Step 1: Install Notion client**

Run: `npm install @notionhq/client`

**Step 2: Create Notion block converter**

```tsx
// src/lib/notion-import.ts
import { Client } from "@notionhq/client";
import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export function createNotionClient(apiKey: string) {
  return new Client({ auth: apiKey });
}

// Convert Notion rich text to Tiptap text nodes
function richTextToTiptap(richText: Array<{ plain_text: string; annotations: { bold: boolean; italic: boolean; underline: boolean } }>) {
  return richText.map((rt) => {
    const marks: Array<{ type: string }> = [];
    if (rt.annotations.bold) marks.push({ type: "bold" });
    if (rt.annotations.italic) marks.push({ type: "italic" });
    if (rt.annotations.underline) marks.push({ type: "underline" });
    return {
      type: "text" as const,
      text: rt.plain_text,
      ...(marks.length > 0 && { marks }),
    };
  });
}

// Convert a Notion block to a Tiptap node
function blockToTiptap(block: BlockObjectResponse): object | null {
  switch (block.type) {
    case "paragraph":
      return {
        type: "paragraph",
        content: block.paragraph.rich_text.length > 0
          ? richTextToTiptap(block.paragraph.rich_text as any)
          : undefined,
      };
    case "heading_1":
      return {
        type: "heading",
        attrs: { level: 1 },
        content: richTextToTiptap(block.heading_1.rich_text as any),
      };
    case "heading_2":
      return {
        type: "heading",
        attrs: { level: 2 },
        content: richTextToTiptap(block.heading_2.rich_text as any),
      };
    case "heading_3":
      return {
        type: "heading",
        attrs: { level: 3 },
        content: richTextToTiptap(block.heading_3.rich_text as any),
      };
    case "bulleted_list_item":
      return {
        type: "listItem",
        content: [{
          type: "paragraph",
          content: richTextToTiptap(block.bulleted_list_item.rich_text as any),
        }],
      };
    case "numbered_list_item":
      return {
        type: "listItem",
        content: [{
          type: "paragraph",
          content: richTextToTiptap(block.numbered_list_item.rich_text as any),
        }],
      };
    case "divider":
      return { type: "horizontalRule" };
    default:
      // Skip unsupported block types
      return null;
  }
}

// Group consecutive list items into bulletList/orderedList wrappers
function groupListItems(nodes: Array<{ type: string; content?: any[]; _sourceType?: string }>): object[] {
  const result: object[] = [];
  let currentList: { type: string; items: object[] } | null = null;

  for (const node of nodes) {
    if (node.type === "listItem" && node._sourceType === "bulleted") {
      if (!currentList || currentList.type !== "bulletList") {
        if (currentList) result.push({ type: currentList.type, content: currentList.items });
        currentList = { type: "bulletList", items: [] };
      }
      const { _sourceType, ...item } = node as any;
      currentList.items.push(item);
    } else if (node.type === "listItem" && node._sourceType === "numbered") {
      if (!currentList || currentList.type !== "orderedList") {
        if (currentList) result.push({ type: currentList.type, content: currentList.items });
        currentList = { type: "orderedList", items: [] };
      }
      const { _sourceType, ...item } = node as any;
      currentList.items.push(item);
    } else {
      if (currentList) {
        result.push({ type: currentList.type, content: currentList.items });
        currentList = null;
      }
      result.push(node);
    }
  }

  if (currentList) result.push({ type: currentList.type, content: currentList.items });
  return result;
}

export async function notionPageToTiptap(client: Client, pageId: string) {
  // Get page title
  const page = await client.pages.retrieve({ page_id: pageId }) as any;
  const titleProp = Object.values(page.properties).find((p: any) => p.type === "title") as any;
  const title = titleProp?.title?.[0]?.plain_text || "Untitled";

  // Get all blocks
  const blocks: BlockObjectResponse[] = [];
  let cursor: string | undefined;
  do {
    const response = await client.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
    });
    blocks.push(...response.results.filter((b): b is BlockObjectResponse => "type" in b));
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  // Convert blocks to Tiptap nodes
  const rawNodes = blocks
    .map((block) => {
      const node = blockToTiptap(block);
      if (!node) return null;
      // Tag list items with their source type for grouping
      if (block.type === "bulleted_list_item") return { ...node, _sourceType: "bulleted" };
      if (block.type === "numbered_list_item") return { ...node, _sourceType: "numbered" };
      return node;
    })
    .filter(Boolean) as any[];

  const content = groupListItems(rawNodes);

  return {
    title,
    content: {
      type: "doc",
      content: content.length > 0 ? content : [{ type: "paragraph" }],
    },
  };
}
```

**Step 3: Create Notion import server action**

```tsx
// src/lib/notion-actions.ts
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { getCurrentSpaceId } from "@/lib/space";
import { createNotionClient, notionPageToTiptap } from "./notion-import";

export async function importFromNotion(notionApiKey: string, pageUrl: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return { error: "No space selected" };

  // Extract page ID from Notion URL
  // Notion URLs: https://www.notion.so/Page-Title-<32-hex-chars>
  // or https://www.notion.so/<workspace>/<32-hex-chars>
  const match = pageUrl.match(/([a-f0-9]{32})(?:\?|$)/i)
    || pageUrl.match(/([a-f0-9-]{36})(?:\?|$)/i);

  if (!match) return { error: "Could not extract page ID from URL. Paste the full Notion page URL." };

  const pageId = match[1];

  try {
    const client = createNotionClient(notionApiKey);
    const { title, content } = await notionPageToTiptap(client, pageId);

    const [doc] = await db.insert(documents).values({
      spaceId,
      title,
      type: "custom",
      content,
      status: "draft",
      createdBy: session.user.id,
    }).returning();

    return { success: true, documentId: doc.id, title };
  } catch (err: any) {
    console.error("Notion import error:", err);
    if (err.code === "unauthorized") {
      return { error: "Invalid Notion API key. Check your integration token." };
    }
    if (err.code === "object_not_found") {
      return { error: "Page not found. Make sure the page is shared with your Notion integration." };
    }
    return { error: "Failed to import from Notion. Check the URL and API key." };
  }
}
```

**Step 4: Update `.env.example`**

```bash
# Notion (for document import — per-user API key entered in UI, not stored server-side)
# No env var needed — users provide their own Notion integration token
```

**Step 5: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/notion-import.ts src/lib/notion-actions.ts package.json package-lock.json .env.example
git commit -m "feat: Notion page import — convert Notion blocks to Tiptap JSON"
```

---

### Task 16: Notion import UI on documents page

**Files:**
- Create: `src/app/(app)/documents/notion-import-dialog.tsx`
- Modify: `src/app/(app)/documents/page.tsx`

**Step 1: Create NotionImportDialog component**

```tsx
// src/app/(app)/documents/notion-import-dialog.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown, Loader2, X } from "lucide-react";
import { importFromNotion } from "@/lib/notion-actions";
import { inputClass } from "@/lib/utils";

export function NotionImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    if (!apiKey.trim() || !pageUrl.trim()) return;
    setLoading(true);
    setError(null);

    const result = await importFromNotion(apiKey.trim(), pageUrl.trim());
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setOpen(false);
      setApiKey("");
      setPageUrl("");
      router.push(`/documents/${result.documentId}/edit`);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-bark-muted hover:text-canopy transition-colors"
      >
        <FileDown size={15} aria-hidden="true" />
        Import from Notion
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bark/30" role="dialog" aria-modal="true" aria-label="Import from Notion">
      <div className="bg-paper rounded-xl border border-border shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Import from Notion
          </h2>
          <button onClick={() => setOpen(false)} aria-label="Close">
            <X size={18} className="text-bark-muted" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="notion-api-key" className="block text-sm font-medium text-bark mb-1">
              Notion Integration Token
            </label>
            <input
              id="notion-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="ntn_..."
              className={inputClass}
            />
            <p className="text-xs text-bark-muted mt-1">
              Create an integration at notion.so/my-integrations and share the page with it.
            </p>
          </div>

          <div>
            <label htmlFor="notion-page-url" className="block text-sm font-medium text-bark mb-1">
              Page URL
            </label>
            <input
              id="notion-page-url"
              type="url"
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              placeholder="https://www.notion.so/..."
              className={inputClass}
              onKeyDown={(e) => e.key === "Enter" && handleImport()}
            />
          </div>

          {error && (
            <div role="alert" className="text-sm text-earth bg-earth/8 border border-earth/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={loading || !apiKey.trim() || !pageUrl.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
            {loading ? "Importing..." : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Add NotionImportDialog to documents page**

In `src/app/(app)/documents/page.tsx`, add the import button next to the "New document" button:

```tsx
import { NotionImportDialog } from "./notion-import-dialog";

// In the page header, alongside the "New document" link:
<div className="flex items-center gap-3">
  <NotionImportDialog />
  <Link href="/documents/new" className="...">New document</Link>
</div>
```

**Step 3: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/app/(app)/documents/notion-import-dialog.tsx src/app/(app)/documents/page.tsx
git commit -m "feat: Notion import UI with dialog on documents page"
```

---

## Part E: Final verification

### Task 17: Full build, lint, and accessibility check

**Step 1: Run lint**

Run: `npm run lint`
Expected: no errors (warnings from jsx-a11y are acceptable for now)

**Step 2: Run build**

Run: `npm run build`
Expected: PASS

**Step 3: Update STATE.md and PLAN.md**

Mark accessibility tasks as done. Mark Google Calendar, Microsoft Calendar, and Notion import as done. Update the "WE ARE HERE" marker if appropriate.

**Step 4: Commit**

```bash
git add STATE.md PLAN.md
git commit -m "docs: update STATE.md and PLAN.md with accessibility and integration progress"
```

---

## Summary

| Part | Tasks | New Files | Modified Files |
|------|-------|-----------|----------------|
| A: Accessibility | 1–10 | 4 new components | ~20 modified |
| B: Google Calendar | 11–13 | 3 new files | ~4 modified |
| C: Microsoft Calendar | 14 | 1 new file | ~3 modified |
| D: Notion Import | 15–16 | 3 new files | ~2 modified |
| E: Verification | 17 | 0 | 2 docs |

**New dependencies:** `eslint-plugin-jsx-a11y` (dev), `@notionhq/client`

**DB changes:** 1 new column (`external_calendar_event_id` on `meetings`)

**No changes to:** Auth flow, billing, live meeting protocol, API endpoints, existing page structure
