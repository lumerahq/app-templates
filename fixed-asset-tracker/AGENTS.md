# Fixed Asset Tracker

Track fixed assets across categories (equipment, vehicles, software, etc.), run monthly depreciation (straight-line or declining balance), view depreciation schedules, and handle disposals with gain/loss tracking.

## How It Works

1. User adds assets manually with cost basis, useful life, salvage value, and depreciation method
2. User clicks "Run Depreciation" → triggers `calculate_depreciation` automation for a given period
3. Automation creates a `depreciation_entries` record, updates `accumulated_depreciation` on the asset
4. When NBV reaches salvage value, status auto-sets to `fully_depreciated`
5. User can dispose an asset — records disposal date, proceeds, and gain/loss

**Asset statuses:** `active` → `fully_depreciated` (automatic) or `disposed` (manual)

**Depreciation entry statuses:** `pending` → `posted`

## Project Structure

```
platform/
├── collections/
│   ├── fixed_assets.json             # Asset register (cost, useful life, salvage, method, status)
│   ├── depreciation_entries.json     # Monthly depreciation records (amount, accumulated, NBV)
│   └── asset_gl_accounts.json        # GL accounts (asset, contra_asset, expense types)
├── automations/calculate_depreciation/  # Depreciation automation (config.json + run.py)
├── agents/asset_assistant/           # AI agent (config.json + system_prompt.md)
src/
├── routes/
│   ├── index.tsx                     # Dashboard (NBV, asset counts, category breakdown)
│   ├── assets.index.tsx              # Asset list with status and category filters
│   ├── assets.$id.tsx                # Asset detail (financials, depreciation schedule, dispose)
│   ├── depreciation.tsx              # Batch depreciation runner
│   └── settings.tsx                  # GL account management
├── lib/queries.ts                    # All data fetching and mutation helpers
├── components/                       # Shared UI (StatusBadge, StatCard, etc.)
scripts/seed-demo.py                  # Seeds assets, GL accounts, and depreciation history
```

**Key external IDs:** `fixed-asset-tracker:calculate_depreciation` (automation — inputs: `asset_id`, `period` as YYYY-MM)

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
5. **Use Python SDK for debugging** — Quick data inspection: `uv run python -c "from lumera import pb; print(pb.search('fixed_assets'))"`

## Frontend Patterns

```typescript
// Data fetching (React Query + Lumera helpers)
import { pbSql, pbList } from '@lumerahq/ui/lib';

const result = await pbSql<Row>({ sql: 'SELECT * FROM fixed_assets WHERE status = {:status}', status: 'active' });
const items = await pbList<Asset>('fixed_assets', { filter: JSON.stringify({ status: "active" }), sort: '-created', perPage: 50 });

// Note: pbSql returns numbers as strings — always cast with Number()

// Running automations from frontend
import { createRun, pollRun } from '@lumerahq/ui/lib';
const run = await createRun({ automationId: 'fixed-asset-tracker:calculate_depreciation', inputs: { asset_id: id, period: '2026-02' } });
const result = await pollRun(run.id);
```

## Backend Patterns (Python SDK)

```python
from lumera import pb

# Records
assets = pb.search("fixed_assets", filter='status = "active"', per_page=100)
asset = pb.get("fixed_assets", "asset_id")
pb.create("depreciation_entries", {"asset": asset_id, "period": "2026-02", "amount": 500.00})
pb.update("fixed_assets", asset_id, {"accumulated_depreciation": new_total, "status": "fully_depreciated"})
```
