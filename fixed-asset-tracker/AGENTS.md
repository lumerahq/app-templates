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

- **Collections** (`platform/collections/*.json`) — Data tables with typed fields. Deployed via `lumera apply`.
- **Automations** (`platform/automations/*/`) — Python scripts that run on Lumera's servers. Each has a `config.json` and `run.py`.
- **Hooks** (`platform/hooks/*.js`) — JavaScript on collection lifecycle events (`before_create`, `after_update`, etc.).
- **Agents** (`platform/agents/*/`) — AI chat agents with a `config.json` and `system_prompt.md`.
- **Webhooks** — Receive events from external services (Stripe, GitHub, etc.). Events land in `lm_event_log`; process them with hooks or automations.
- **Mailbox** — Each tenant gets an email address. Inbound emails are persisted to `lm_mailbox_messages` — use hooks to trigger automations on new mail.
- **Email** — Send transactional emails from automations via `from lumera import email`. Logged to `lm_email_logs`.

All resources use **external IDs** in the format `<app-name>:<resource-name>` (auto-derived from `package.json` name + directory/file name).

## Architecture Files

- **architecture.md** — Technical reference for coding agents. Data models, schemas, relations, hook logic, automation flows, design decisions. An agent starting a new session should understand the full system from this file.
- **ARCHITECTURE.html** — Human-facing docs. Self-contained HTML with product overview, data flow diagrams, system architecture visuals.

**Write `architecture.md` before writing code.** When the user describes what they want to build, first propose a plan and write it to `architecture.md` — which collections, hooks, automations, and pages are needed and how they connect. Then implement. Update `architecture.md` after any significant changes to the data model or flows.

## Workflow

1. **Read skills first** — Before writing automations, hooks, collections, or agents, read the matching skill file for API details and patterns.
2. **Architecture first** — Propose a plan, write `architecture.md`, then implement. Update it after significant changes.
3. **Code is source of truth** — Edit files in `platform/`, then deploy with `lumera apply`. Don't edit in the Lumera UI.
4. **Plan before apply** — Run `lumera plan` to preview changes, then `lumera apply` to deploy.
5. **Offer to deploy** — After changing platform resources, offer to run `lumera apply`.
6. **Deploy marker** — When your changes create or modify platform resources that need `lumera apply`, include at the very end of your response: `<!-- DEPLOY: short commit message -->`. Do NOT include for frontend-only changes.

## Key Commands

```bash
lumera plan                            # Preview changes (dry run)
lumera apply                           # Deploy everything
lumera run scripts/seed-demo.py        # Run seed script remotely
lumera status                          # Show sync status
```
