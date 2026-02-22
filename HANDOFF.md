# Handoff — 2026-02-22

## What happened this session

Completed all remaining code-only items from the plan. Six features shipped:

### Completed

1. **Public pages + transparency layer** — `/public/[spaceSlug]/decisions` and `/documents` with space-level toggles
2. **Per-item visibility** — `isPublic` boolean on decisions and documents, checkbox in forms, Globe badge
3. **Embeddable decision log widget** — `/embed/[spaceSlug]/decisions` for iframe embedding
4. **Markdown import/export** — `markdownToTiptap()` converter, file upload on document form, download button on detail page
5. **Interactive walkthrough** — 7-step tooltip walkthrough with localStorage persistence, restart in settings
6. **Help documentation** — `/help` page with 9 sections, linked from sidebar
7. **Configurable vote threshold** — Space setting (0.5–0.75), threaded through live meeting to VoteFlow
8. **PDF export** — Print-friendly meeting record at `/meetings/[id]/print`
9. **REST API** — `/api/v1/` with 6 endpoints (decisions, documents, meetings, actions) + API key auth
10. **API key management** — Settings UI for creating/deleting keys, SHA-256 hashing, usage tracking
11. **Webhooks** — decision.created/updated/status_changed events, HMAC-SHA256 signing, settings UI
12. **Word document export** — `.doc` format via `?format=docx` query param, `tiptapToHtml()` converter

### Key files created

| File | Purpose |
|------|---------|
| `src/lib/api-auth.ts` | API key authentication helper |
| `src/lib/api-key-actions.ts` | Server actions for API key CRUD |
| `src/lib/webhooks.ts` | Webhook delivery (fire-and-forget, HMAC signing) |
| `src/lib/webhook-actions.ts` | Server actions for webhook CRUD |
| `src/app/api/v1/decisions/route.ts` | GET /api/v1/decisions |
| `src/app/api/v1/decisions/[number]/route.ts` | GET /api/v1/decisions/[number] |
| `src/app/api/v1/documents/route.ts` | GET /api/v1/documents |
| `src/app/api/v1/documents/[id]/route.ts` | GET /api/v1/documents/[id] |
| `src/app/api/v1/meetings/route.ts` | GET /api/v1/meetings |
| `src/app/api/v1/actions/route.ts` | GET /api/v1/actions |
| `src/app/(app)/settings/api-keys.tsx` | API key management UI |
| `src/app/(app)/settings/webhooks.tsx` | Webhook management UI |
| `src/app/(app)/meetings/[id]/print/page.tsx` | Print-friendly meeting record |
| `src/app/(app)/meetings/[id]/print/print-button.tsx` | Print trigger button |

### Key files modified

| File | Change |
|------|--------|
| `src/db/schema.ts` | Added `apiKeys`, `webhooks` tables, `isPublic` on decisions + documents |
| `src/lib/queries.ts` | Added `getApiKeys()`, `getWebhooks()`, `outcome` in getMeetingById |
| `src/lib/decision-actions.ts` | Added `fireWebhooks()` calls on create/update/status change |
| `src/lib/tiptap-utils.ts` | Added `tiptapToHtml()`, `markdownToTiptap()` |
| `src/app/api/documents/[id]/export/route.ts` | Added `?format=docx` Word export |
| `src/app/(app)/settings/page.tsx` | Added API keys + webhooks sections |
| `src/middleware.ts` | Added `/api/v1` to public paths |
| `PLAN.md` | Added Manual Deployment Steps section, marked all code items done |
| `STATE.md` | Full rewrite with current status |

### Database changes

Two new tables created via migration scripts:
- `api_keys` (id, space_id, name, key_hash, key_prefix, permissions, last_used_at, expires_at, created_at)
- `webhooks` (id, space_id, url, secret, events, active, last_delivery_at, last_delivery_status, created_at)

Plus `is_public` boolean column added to `decisions` and `documents` tables.

## What to do next

All code-only work is complete. Remaining items require external service setup:

1. **Deploy to Vercel** — See PLAN.md "Manual Deployment Steps" for env vars and post-deploy checklist
2. **Set up Resend** — Get API key, verify domain, set `AUTH_RESEND_KEY`
3. **Configure Stripe for production** — Create products, set price IDs, create webhook endpoint
4. **Charity pricing** — Create Stripe coupon code
5. **Sentry error monitoring** (optional) — Install SDK, set DSN
6. **Vercel Analytics** (optional) — Enable in dashboard, add `<Analytics />` to layout

### Human decisions needed

- Open source licence model (AGPL, MIT, BSL)
- WCAG 2.1 AA accessibility strategy
- Integration priorities (Google Workspace, Microsoft 365, Notion)
- Pilot organisation for beta testing

## Build status

- `npm run build` — **passing**
- `npm run lint` — **no errors**
