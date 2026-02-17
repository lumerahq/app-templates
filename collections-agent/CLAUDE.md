# Collections Agent - Claude Code Instructions

**Full Architecture**: See `ARCHITECTURE.md`

## Template: Collections Agent

Monitor AR aging, draft AI-powered collection emails, and track customer touchpoints.

### Data Flow

1. Import customers and AR invoices (via Settings page or `lumera run scripts/seed-demo.py`)
2. Dashboard shows AR aging overview — total outstanding, aging buckets, priority customers
3. User clicks "Draft Collection Email" on a customer → triggers `draft_collection_email` automation
4. AI reviews open invoices, drafts tone-appropriate email → saved as activity
5. User reviews email, updates customer status through the collection lifecycle

### Collections

- **`customers`** — name, email, contact_name, phone, total_outstanding, oldest_due_date, status, notes
- **`ar_invoices`** — linked to customer, invoice_number, amount, due_date, days_overdue, status (open/partial/paid/written_off)
- **`collection_activities`** — linked to customer, activity_type (email_draft/email_sent/call/note/promise_to_pay), subject, content, contact_date

### Key External IDs

- `collections-agent:draft_collection_email` — automation that drafts a collection email based on customer's open invoices

### Status Lifecycle

`active` → `contacted` → `promised` / `escalated` → `resolved`

---

## AI Agent Skills

This project includes Lumera skills for AI coding agents in `.claude/skills/`. Read the relevant skill file when you need detailed API docs and usage patterns for that capability.

<!-- LUMERA_SKILLS_START -->
**lumera-architecture-diagrams** — Generate visual architecture diagrams for Lumera projects. Creates an ARCHITECTURE.html file with a polished, professional visual diagram.

**lumera-automations** — Create, run, and manage Lumera automations (background Python scripts). Create automations with `POST /api/automations`. Run them with `POST /api/automation-runs`. Monitor via `GET /api/automation-runs/{id}` or stream logs with `GET /api/automation-runs/{id}/logs/live`.

**lumera-collections** — Manage data collections and records via the `lumera_api` tool. Use `GET /api/pb/collections` to list collections, `PUT /api/pb/collections/{name}` to ensure a collection exists with a given schema, and the records API for data operations. Supports filtering, search, and upsert by `external_id`.

**lumera-file-uploads** — Upload and download files using the `lumera_api` tool. Use presigned URLs for uploads, then confirm with the resource endpoint. Download files via `GET .../download-url?name=filename`. Supports sessions, agent runs, documents, and PocketBase files.

**lumera-sdk** — Write Python automations using the Lumera SDK. Use `from lumera import pb` for records, `from lumera import storage` for files, `from lumera import llm` for AI completions, `from lumera import email` for sending emails. Avoid importing from `lumera.sdk` directly.

**lumera-using-lumera** — Build event-driven automation pipelines using collections, hooks, and automations.

**lumera-webhooks** — Receive events from external services (Stripe, GitHub, Slack, etc.) via webhooks. Create endpoints with `webhooks.create()`, get the public URL with `webhooks.url()`, and process events from `lm_event_log`. Trigger automations via hooks on `lm_event_log.after_create`.

**lumera-write-hooks** — Author Lumera collection hooks in JavaScript. Hooks run on lifecycle events (`before_create`, `after_update`, etc.). Manage via `GET/POST/PATCH/DELETE /api/pb/hooks`.
<!-- LUMERA_SKILLS_END -->

### Managing Skills

```bash
lumera skills update              # Update all skills to latest
lumera skills install --force     # Re-install from scratch
```

---

## Quick Reference

### Lumera CLI

All `lumera` commands are run via `pnpm dlx`:

```bash
# Shortcuts
pnpm dev              # Start dev server
pnpm deploy           # Deploy frontend

# All other commands
pnpm dlx @lumerahq/cli plan
pnpm dlx @lumerahq/cli apply
pnpm dlx @lumerahq/cli destroy
pnpm dlx @lumerahq/cli run scripts/seed-demo.py
pnpm dlx @lumerahq/cli status
```

### Running the Frontend

```bash
# Login first (stores credentials in .lumera/credentials.json)
lumera login

# Start dev server
pnpm dev

# With custom port
lumera dev --port 3000

# With ngrok tunnel
lumera dev --url https://my-tunnel.ngrok.io

# Plain vite (no Lumera registration)
pnpm dev:vite
```

### Linting & Formatting

```bash
# Type check without emitting
pnpm typecheck

# Lint and auto-fix
pnpm lint

# Format code
pnpm format

# Run all checks (lint + format + typecheck) - use in CI
pnpm check:ci
```

### Deploying

```bash
# Deploy frontend
lumera apply app

# Apply all resources (collections, automations, hooks, app)
lumera apply

# Preview changes first
lumera plan
```

### Running Scripts

All scripts are **idempotent** - safe to run multiple times during iterative development.

```bash
# Run a script locally
lumera run scripts/seed-demo.py

# Dependencies can be declared inline (PEP 723)
```

### Running Automations via External ID

Always run automations using their `external_id` (not the internal Lumera ID which changes per tenant).

```python
uv run python << 'EOF'
from lumera import automations

# Run automation by external_id (returns Run object immediately)
run = automations.run_by_external_id(
    "collections-agent:my_automation",
    inputs={"param": "value"}
)
print(f"Run ID: {run.id}")
print(f"Status: {run.status}")

# Wait for completion (blocks until done or timeout)
result = run.wait(timeout=600)  # 10 min timeout
print(f"Result: {result}")
EOF
```

**Run object properties**: `id`, `status`, `result`, `error`, `inputs`, `is_terminal`
**Run object methods**: `wait(timeout)`, `refresh()`, `cancel()`
**Status values**: `queued`, `running`, `succeeded`, `failed`, `cancelled`, `timeout`

---

## Important Rules

1. **Authenticate first** - Before running any CLI or SDK commands, ensure the user has run `lumera login`. This stores credentials in `.lumera/credentials.json` which the SDK reads automatically.

2. **Source of truth is code** - `platform/` contains all schemas, automations, hooks. Update local code first, then deploy.

3. **Never edit Lumera directly** - Don't change data/schema in Lumera UI without explicit user approval.

4. **Offer to deploy** - When schemas, hooks, or automations change, offer to deploy to Lumera.

5. **Use lumera-sdk skill for Python** - When writing scripts or automations, refer to the **lumera-sdk** skill (`.claude/skills/lumera-sdk.md`) for available SDK functions and usage patterns. The SDK source code is also available in `.venv/lib/python*/site-packages/lumera/` for detailed implementation reference. Key modules:
   - `lumera.pb` - Record and collection operations (search, get, create, update, delete)
   - `lumera.storage` - File uploads and downloads
   - `lumera.llm` - LLM completions
   - `lumera.automations` - Running and managing automations
   - `lumera.integrations` - Third-party integrations (Google, Slack, etc.)

6. **Use Python SDK for ad-hoc investigation** - When you need to quickly query data, inspect records, or debug issues, use the Python SDK with `uv run python` (uses `.venv` automatically via `pyproject.toml`):
   ```bash
   uv run python -c "from lumera import pb; print(pb.search('collection_name'))"
   ```

---

## Key Directories

```
platform/
├── automations/    # Automation scripts (Python)
├── collections/    # Collection schemas (JSON)
└── hooks/          # Server-side JavaScript hooks

scripts/            # Local scripts (seed, migrate, etc.)

src/                # React frontend
├── routes/         # TanStack Router pages
├── lib/            # queries.ts, api helpers
└── components/     # React components

.venv/              # Python venv with lumera SDK (for IDE autocomplete)
```

### Python Environment

A Python virtual environment is created at `.venv/` with the `lumera` SDK pre-installed. This provides IDE autocomplete when writing automations and scripts.

```bash
# Activate venv (optional - for IDE integration)
source .venv/bin/activate

# SDK is available for import
python -c "from lumera import pb; print(pb)"
```

> **Note:** You don't need to activate the venv to run scripts - `lumera run` handles this automatically.

---

## Frontend Patterns

### Fetching Data

```typescript
import { pbSql, pbList } from '@lumerahq/ui/lib';

const result = await pbSql<{ id: string; name: string }>({
  sql: 'SELECT id, name FROM users WHERE active = true'
});

const items = await pbList<User>('users', {
  filter: JSON.stringify({ status: "active" }),
  sort: '-created',
  perPage: 50,
});
```

### Running Automations from Frontend

```typescript
import { createRun, pollRun } from '@lumerahq/ui/lib';

const run = await createRun({
  automationId: 'collections-agent:process_data',
  inputs: { file_id: 'abc123' },
});

const result = await pollRun(run.id);
```

---

## Debugging with Lumera SDK

```python
uv run python << 'EOF'
from lumera import pb

# List collections
print(pb.list_collections())

# Search records
result = pb.search("my_collection", per_page=10)
print(result)

# Get single record
record = pb.get("my_collection", "record_id")
print(record)
EOF
```
