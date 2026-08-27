# Glade API v1 and remote MCP

Glade exposes a small space-scoped API for integrations and agents. API keys
are created for one Glade space and use Bearer authentication.

## API keys

A key has either `read` or `read_write` permission. Expired keys are rejected.
The API key never grants access outside its configured space.

## API v1

Read endpoints:

- `GET /api/v1/decisions`
- `GET /api/v1/decisions/:number`
- `GET /api/v1/actions`
- `GET /api/v1/meetings`
- `GET /api/v1/documents`

Action writes:

- `POST /api/v1/actions` — create a private action; requires `read_write`
- `PATCH /api/v1/actions/:id` — update description, owner, due date or status;
  requires `read_write`

Attention-created actions are private by default.

### Action provenance

Actions have a small `metadata` object for provenance. It should carry
references, not copies of source content.

Example:

```json
{
  "source": "attention",
  "origin": {
    "system": "tending",
    "recordId": "..."
  },
  "contextEventId": "..."
}
```

The metadata field is intentionally generic but bounded at the API layer. A
Glade action remains a commitment; provenance only explains where that
commitment arose.

## Remote MCP

Glade exposes Streamable HTTP MCP at:

`https://ourglade.app/mcp`

Use the normal Glade API key as the Bearer credential. MCP does not introduce a
new permissions model; each underlying API operation still enforces the key's
space and read/read_write permission.

Tools:

- `glade_list_decisions`
- `glade_get_decision`
- `glade_list_open_actions`
- `glade_create_action`
- `glade_update_action`
- `glade_list_meetings`
- `glade_list_documents`
- `glade_draft_decision_candidate`

`glade_draft_decision_candidate` is deliberately non-persistent. It structures
a candidate for human review; it does not record a governance decision.

There is intentionally no agent-facing automatic decision-creation tool in
this pilot.
