# {{projectTitle}} - Claude Code Instructions

## Overview

AI-powered invoice processing with automatic GL coding, vendor management, and approval workflows.

## Collections

- **invoices** — Core invoice records with status workflow, GL coding fields, and AI confidence scores.
- **vendors** — Vendor directory with default GL codes and payment terms.
- **gl_accounts** — Chart of accounts with codes, types (expense/asset/liability/revenue), and departments.
- **audit_log** — Activity trail for compliance — tracks every action (created, ai_coded, approved, rejected, posted).

## Automations

- **classify_and_code** (`{{projectName}}:classify_and_code`) — AI-powered GL code assignment. Analyzes invoice details against the GL account chart, assigns GL code + department + confidence score. Triggered from the invoice detail page.

## Status Workflow

```
received → processing → coded → pending_approval → approved → posted
                                                  ↘ rejected
```

Confidence >= 90% → `coded`. Below 90% → `pending_approval` for human review. `rejected` is terminal.

## Key Files

- `platform/collections/` — Collection schemas (invoices, vendors, gl_accounts, audit_log)
- `platform/automations/classify_and_code/` — AI coding automation (config.json + main.py)
- `scripts/seed-demo.py` — Seeds GL accounts, vendors, invoices, and audit log entries
- `src/routes/index.tsx` — Dashboard with stats and recent invoices
- `src/routes/invoices.index.tsx` — Invoice list with status filters and "New Invoice" button
- `src/routes/invoices.new.tsx` — New invoice form with document upload
- `src/routes/invoices.$invoiceId.tsx` — Invoice detail with AI coding, approval actions, and audit trail
- `src/routes/audit.tsx` — Full audit log with action filters, pagination, and CSV export
- `src/routes/how-it-works.tsx` — Workflow guide explaining the processing pipeline
- `src/routes/settings.tsx` — GL accounts and vendor management tables
- `src/lib/queries.ts` — Types and data fetching functions

---

## AI Agent Skills

This project includes Lumera skills for AI coding agents in `.claude/skills/`. Read the relevant skill file when you need detailed API docs and usage patterns for that capability.

<!-- LUMERA_SKILLS_START -->
_Run `lumera skills install` to populate skill descriptions._
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
    "{{projectName}}:classify_and_code",
    inputs={"invoice_id": "some_invoice_id"}
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
├── automations/    # classify_and_code (AI GL coding)
├── collections/    # invoices, vendors, gl_accounts schemas
└── hooks/          # Server-side JavaScript hooks

scripts/            # seed-demo.py (sample data)

src/                # React frontend
├── routes/         # Dashboard, invoices, invoice detail, settings
├── lib/            # queries.ts (types + data fetching)
└── components/     # Sidebar, StatCard, layout
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
  automationId: '{{projectName}}:classify_and_code',
  inputs: { invoice_id: 'some_id' },
});

const result = await pollRun(run.id);
if (result.status === 'succeeded') {
  // Refresh data
}
```

---

## Debugging with Lumera SDK

```python
uv run python << 'EOF'
from lumera import pb

# List collections
print(pb.list_collections())

# Search invoices
result = pb.search("invoices", per_page=10)
print(result)

# Get single record
record = pb.get("invoices", "record_id")
print(record)
EOF
```
