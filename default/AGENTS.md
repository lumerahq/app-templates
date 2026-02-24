# Default App

Blank starter template with a dashboard, one example collection (`example_items`), and a seed script. Use this as a starting point — replace the example collection with your own domain.

## Project Structure

```
platform/
├── collections/example_items.json   # Example collection schema
├── agents/assistant/                # AI agent (config.json + system_prompt.md)
src/
├── routes/index.tsx                 # Dashboard
├── routes/settings.tsx              # Settings page
├── lib/queries.ts                   # Data fetching helpers
├── components/                      # Shared UI components
scripts/seed-demo.py                 # Seed data script
```

## Lumera Concepts

A Lumera app is built from these primitives — all defined as code in `platform/`:

- **Collections** (`platform/collections/*.json`) — Data tables with typed fields. Schemas are JSON files deployed via `lumera apply`. Query with SQL or the records API.
- **Automations** (`platform/automations/*/`) — Python scripts that run on Lumera's servers. Each has a `config.json` (name, inputs) and `run.py`. Triggered from the frontend or by hooks.
- **Hooks** (`platform/hooks/*.js`) — JavaScript snippets that run on collection lifecycle events (`before_create`, `after_update`, etc.). Used for triggering automations, audit logging, or data validation.
- **Agents** (`platform/agents/*/`) — AI chat agents with a `config.json` (name, skills) and `system_prompt.md`. Deploy with `lumera apply agents`.

All resources use **external IDs** in the format `<app-name>:<resource-name>` (auto-derived by the CLI from `package.json` name + directory/file name). Use external IDs when referencing automations from frontend or hooks.

## Skills

Read the skill files in `.claude/skills/` for detailed API docs. Key skills:

<!-- LUMERA_SKILLS_START -->
**lumera-automations** — Create, run, and manage Lumera automations (background Python scripts). Create automations with `POST /api/automations`. Run them with `POST /api/automation-runs`. Monitor via `GET /api/automation-runs/{id}` or stream logs with `GET /api/automation-runs/{id}/logs/live`.

**lumera-collections** — Manage data collections and records via the `lumera_api` tool. Use `GET /api/pb/collections` to list collections, `PUT /api/pb/collections/{name}` to ensure a collection exists with a given schema, and the records API for data operations. Supports filtering, search, and upsert by `external_id`.

**lumera-file-uploads** — Upload and download files using the `lumera_api` tool. Use presigned URLs for uploads, then confirm with the resource endpoint. Download files via `GET .../download-url?name=filename`. Supports sessions, agent runs, documents, and PocketBase files.

**lumera-sdk** — Write Python automations using the Lumera SDK. Use `from lumera import pb` for records, `from lumera import storage` for files, `from lumera import llm` for AI completions, `from lumera import email` for sending emails. Avoid importing from `lumera.sdk` directly.

**lumera-using-lumera** — Build event-driven automation pipelines using collections, hooks, and automations.

**lumera-webhooks** — Receive events from external services (Stripe, GitHub, Slack, etc.) via webhooks. Create endpoints with `webhooks.create()`, get the public URL with `webhooks.url()`, and process events from `lm_event_log`. Trigger automations via hooks on `lm_event_log.after_create`.

**lumera-write-hooks** — Author Lumera collection hooks in JavaScript. Hooks run on lifecycle events (`before_create`, `after_update`, etc.). Manage via `GET/POST/PATCH/DELETE /api/pb/hooks`.

**lumera-agents** — Build and manage AI-powered chat agents with custom system prompts, skills, and tools. Create agents via `POST /api/agents`, invoke synchronously via `POST /api/agents/{id}/invoke`, or stream responses via `POST /api/agents/{id}/chat`.
<!-- LUMERA_SKILLS_END -->

## CLI Cheatsheet

```bash
pnpm dev                              # Start dev server (login first: lumera login)
lumera apply                           # Deploy all (collections, automations, hooks, agents, app)
lumera plan                            # Preview what will change
lumera run scripts/seed-demo.py        # Run seed script
lumera apply app                       # Deploy frontend only
lumera skills update                   # Update skill files to latest
```

## Rules

1. **Read skills first** — Before writing automations, hooks, or collection schemas, read the relevant `.claude/skills/` file for API details and patterns.
2. **Code is source of truth** — Edit files in `platform/` first, then deploy with `lumera apply`. Don't edit in the Lumera UI.
3. **Offer to deploy** — After changing collections, hooks, automations, or agents, offer to run `lumera apply`.
4. **Authenticate first** — User must run `lumera login` before any CLI/SDK commands.
5. **Use Python SDK for debugging** — Quick data inspection: `uv run python -c "from lumera import pb; print(pb.search('collection_name'))"`

## Frontend Patterns

```typescript
// Data fetching (React Query + Lumera helpers)
import { pbSql, pbList } from '@lumerahq/ui/lib';

const result = await pbSql<Row>({ sql: 'SELECT * FROM example_items WHERE status = {:status}', status: 'active' });
const items = await pbList<Item>('example_items', { filter: JSON.stringify({ status: "active" }), sort: '-created', perPage: 50 });

// Note: pbSql returns numbers as strings — always cast with Number()

// Running automations from frontend
import { createRun, pollRun } from '@lumerahq/ui/lib';
const run = await createRun({ automationId: 'default-app:my_automation', inputs: { key: 'value' } });
const result = await pollRun(run.id);

// File uploads
import { useFileUpload } from '@lumerahq/ui/hooks';
// See lumera-file-uploads skill for details
```

## Backend Patterns (Python SDK)

```python
from lumera import pb, llm, storage

# Records
records = pb.search("example_items", filter='status = "active"', per_page=50)
record = pb.get("example_items", "record_id")
pb.create("example_items", {"name": "New", "status": "active"})
pb.update("example_items", "record_id", {"status": "done"})

# AI
result = llm.complete("Extract the key fields", json_mode=True)
text = llm.extract_text(source=file_bytes, mime_type="application/pdf", filename="doc.pdf")

# Files
file_bytes = storage.download("object_key")
```
