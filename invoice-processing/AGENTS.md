# Invoice Processing

Upload invoice documents (PDF, images), AI extracts structured data (vendor, amounts, line items, GL codes), then review and approve. Full audit trail and activity comments.

## How It Works

1. User uploads a document → `ip_invoices` record created (`status: draft`)
2. `ip_trigger_extract` hook fires on `after_create` → sets `status: processing`, queues `extract_invoice` automation
3. `extract_invoice` reads the document with `llm.extract_text()`, populates invoice fields, creates `ip_line_items`, sets `status: review`
4. `ip_create_status_comment` hook records every status change in `ip_comments`
5. User reviews extracted data, edits mistakes, approves or rejects

**Status flow:** `draft` → `processing` → `review` → `approved` / `rejected`

## Project Structure

```
platform/
├── collections/
│   ├── ip_invoices.json          # Invoice records (document, vendor, amounts, status)
│   ├── ip_vendors.json           # Vendor directory with default GL codes
│   ├── ip_gl_accounts.json       # Chart of accounts
│   ├── ip_line_items.json        # Line items per invoice (desc, qty, amount, gl_code)
│   ├── ip_comments.json          # Activity timeline (comments, approvals, system events)
│   └── ip_audit_log.json         # Audit trail for all entity changes
├── automations/extract_invoice/  # AI extraction automation (config.json + run.py)
├── hooks/
│   ├── ip_trigger_extract.js     # after_create on ip_invoices → queues extraction
│   ├── ip_create_status_comment.js  # Logs status changes as comments
│   └── ip_audit_*.js             # Audit logging hooks for all collections
├── agents/invoice_assistant/     # AI agent (config.json + system_prompt.md)
src/
├── routes/
│   ├── index.tsx                 # Dashboard (stats, pipeline, recent invoices)
│   ├── invoices.index.tsx        # Invoice list with status filter tabs
│   ├── invoices.$id.tsx          # Invoice detail (document preview + editable form)
│   ├── settings.tsx              # Vendor and GL account management
│   └── audit.tsx                 # Audit log viewer
├── lib/queries.ts                # All data fetching and mutation helpers
├── components/                   # Shared UI (StatusBadge, StatCard, FileDropzone, etc.)
scripts/seed-demo.py              # Seeds vendors, GL accounts, and demo invoices
```

**Key external IDs:** `invoice-processing:extract_invoice` (automation), `invoice-processing:ip_trigger_extract` (hook)

## Architecture Diagram (`ARCHITECTURE.html`)

Maintain an `ARCHITECTURE.html` file in the project root that gives a human a visual, instant understanding of how the app works. **Regenerate it whenever the data model, automations, hooks, or pages change significantly.**

Requirements:
- **Single self-contained HTML file** — no external dependencies. All CSS and JS inline.
- **SVG diagrams** (not ASCII art) showing the data flow, collection relationships, and automation triggers. Use `<svg>` elements directly in the HTML.
- **Animated flow lines** — Use CSS animations (`stroke-dashoffset`, `@keyframes`) to show data moving through the pipeline (e.g., upload → AI extraction → review → approval). Keep animations subtle and purposeful.
- **Interactive sections** — Clickable/hoverable nodes that highlight related components or show tooltips with details.
- **Color-coded by type** — Collections (blue), automations (purple), hooks (orange), frontend pages (green), external services (gray).
- **Three visual sections**:
  1. **System overview** — High-level boxes showing Frontend → Lumera API → Database / Automation Runtime
  2. **Data flow** — Step-by-step animated diagram of the invoice workflow: Upload → `trigger_extract` hook → `extract_invoice` automation → Review → Approve/Reject, with `create_status_comment` and audit hooks shown as side branches
  3. **Collection relationships** — ER diagram showing `ip_invoices` → `ip_line_items`, `ip_invoices` → `ip_comments`, `ip_vendors` → `ip_invoices`, `ip_gl_accounts` → `ip_line_items`
- **Clean, modern styling** — White background, rounded corners, subtle shadows, system font stack. Should look professional when opened in a browser.
- **Responsive** — Readable on both desktop and tablet widths.

Generate with: "Create/update the ARCHITECTURE.html file to reflect the current app structure."

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

## Lumera CLI

All `lumera` CLI commands are invoked via `bunx @lumerahq/cli <command>`. The `package.json` has shortcuts for common ones (`bun dev`, `bun deploy`).

### First-time setup

```bash
lumera login                           # Authenticate — stores creds in .lumera/credentials.json
bun install                           # Install frontend dependencies
bun dev                               # Start dev server (runs lumera dev under the hood)
lumera run scripts/seed-demo.py        # Seed vendors, GL accounts, and demo invoices
```

`lumera login` is required before any CLI or SDK command. It opens a browser for auth and saves credentials locally. The SDK (`from lumera import pb`) reads these automatically.

### Developing

```bash
bun dev                               # Start dev server with Lumera registration (iframe mode)
bun dev:vite                          # Plain Vite dev server (no Lumera registration)
lumera dev --port 3001                  # Dev server on a custom port
lumera dev --url https://xyz.ngrok.io   # Dev server behind an ngrok tunnel
```

`bun dev` registers the app with Lumera so it appears in the sidebar, then starts Vite. Use `bun dev:vite` for faster iteration when you don't need the Lumera iframe.

### Deploying resources

```bash
lumera plan                            # Preview all changes (dry run — shows what would be created/updated/deleted)
lumera apply                           # Deploy everything: collections, automations, hooks, agents, and frontend
lumera apply collections               # Deploy only collection schemas
lumera apply automations               # Deploy only automations (e.g. after editing extract_invoice)
lumera apply hooks                     # Deploy only hooks (e.g. after editing trigger_extract)
lumera apply agents                    # Deploy only agents
lumera apply app                       # Deploy only the frontend (builds + uploads)
```

**Typical workflow:** Edit files in `platform/` → run `lumera plan` to review → run `lumera apply` to deploy. Always plan before apply to catch issues.

### Running scripts

```bash
lumera run scripts/seed-demo.py        # Run seed script on Lumera's servers
lumera run scripts/migrate.py          # Run any Python script
```

Scripts run remotely on Lumera's infrastructure with full SDK access. They should be **idempotent** — safe to run multiple times. Dependencies are declared inline using PEP 723 (`# /// script` blocks).

### Managing resources

```bash
lumera status                          # Show sync status of all resources (collections, automations, hooks, agents)
lumera list collections                # List all collections with sync status
lumera list automations                # List all automations
lumera list hooks                      # List all hooks
lumera list agents                     # List all agents with sync status
lumera destroy                         # Delete all deployed resources (interactive confirmation)
```

### Running agents

```bash
lumera run agents/invoice_assistant "What invoices are pending review?"    # Invoke an agent
lumera run agents/invoice_assistant "Approve it" --session my-session      # Continue conversation
```

### Skills management

```bash
lumera skills update                   # Update all skill files in .claude/skills/ to latest from Lumera API
lumera skills install --force          # Re-install skills from scratch
```

### Running automations from Python

```python
uv run python << 'EOF'
from lumera import automations

run = automations.run_by_external_id("invoice-processing:extract_invoice", inputs={"invoice_id": "abc123"})
print(f"Status: {run.status}")        # queued → running → succeeded/failed

result = run.wait(timeout=300)         # Block until done (5 min timeout)
print(f"Result: {result}")
EOF
```

**Run object:** `id`, `status`, `result`, `error`, `inputs`, `is_terminal` (properties) · `wait(timeout)`, `refresh()`, `cancel()` (methods)
**Status values:** `queued` → `running` → `succeeded` / `failed` / `cancelled` / `timeout`

### Code quality

```bash
bun typecheck                         # TypeScript type check (no emit)
bun lint                              # Lint and auto-fix with Biome
bun format                            # Format code with Biome
bun check:ci                          # Run all checks (lint + format + typecheck) — use before committing
```

## Rules

1. **Read skills first** — Before writing automations, hooks, or collection schemas, read the relevant `.claude/skills/` file for API details and patterns.
2. **Code is source of truth** — Edit files in `platform/` first, then deploy with `lumera apply`. Don't edit in the Lumera UI.
3. **Offer to deploy** — After changing collections, hooks, automations, or agents, offer to run `lumera apply`.
4. **Authenticate first** — User must run `lumera login` before any CLI/SDK commands.
5. **Use Python SDK for debugging** — Quick data inspection: `uv run python -c "from lumera import pb; print(pb.search('ip_invoices'))"`

## Frontend Patterns

```typescript
// Data fetching (React Query + Lumera helpers)
import { pbSql, pbList } from '@lumerahq/ui/lib';

const result = await pbSql<Row>({ sql: 'SELECT * FROM ip_invoices WHERE status = {:status}', status: 'review' });
const items = await pbList<Invoice>('ip_invoices', { filter: JSON.stringify({ status: "review" }), sort: '-created', perPage: 50 });

// Note: pbSql returns numbers as strings — always cast with Number()

// Running automations from frontend
import { createRun, pollRun } from '@lumerahq/ui/lib';
const run = await createRun({ automationId: 'invoice-processing:extract_invoice', inputs: { invoice_id: id } });
const result = await pollRun(run.id);

// File uploads and preview
import { useFileUpload } from '@lumerahq/ui/hooks';
import { getDownloadUrl } from '@lumerahq/ui/lib';
// See lumera-file-uploads skill for details
```

## Backend Patterns (Python SDK)

```python
from lumera import pb, llm, storage

# Records
records = pb.search("ip_invoices", filter='status = "review"', per_page=50)
record = pb.get("ip_invoices", "record_id")
pb.create("ip_invoices", {"vendor_name": "Acme", "status": "draft"})
pb.update("ip_invoices", "record_id", {"status": "approved"})

# AI extraction
text = llm.extract_text(source=file_bytes, mime_type="application/pdf", filename="invoice.pdf", prompt="Extract invoice fields")
result = llm.complete("Parse this into structured data: " + text, json_mode=True)

# Files
file_bytes = storage.download("object_key")
```
