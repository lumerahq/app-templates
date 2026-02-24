# Fixed Asset Tracker — Technical Reference

## Overview

Asset register with monthly depreciation (straight-line / declining balance), depreciation schedules, and disposal with gain/loss tracking. No hooks — all automations are user-triggered.

**Asset statuses:** `active` → `fully_depreciated` (auto) or `disposed` (manual)

**Depreciation entry statuses:** `pending` → `posted`

## Collections

### fixed_assets
| Field | Type | Notes |
|-------|------|-------|
| `name` | text | Asset name |
| `asset_tag` | text | Internal tag / serial number |
| `category` | select | `equipment` · `furniture` · `vehicles` · `software` · `buildings` · `leasehold_improvements` |
| `status` | select | `active` · `fully_depreciated` · `disposed` |
| `acquisition_date` | date | |
| `cost_basis` | number | Original purchase cost |
| `salvage_value` | number | Estimated residual value |
| `useful_life_months` | number | |
| `depreciation_method` | select | `straight_line` · `declining_balance` |
| `accumulated_depreciation` | number | Running total, updated by automation |
| `location` | text | |
| `department` | text | |
| `disposal_date` | date | Set on disposal |
| `disposal_proceeds` | number | Sale proceeds |
| `notes` | text | |

**NBV** = `cost_basis - accumulated_depreciation` (computed, not stored).

**Gain/loss** = `disposal_proceeds - NBV` (computed client-side on disposal).

### depreciation_entries
| Field | Type | Notes |
|-------|------|-------|
| `fixed_asset` | relation | → fixed_assets |
| `period` | text | YYYY-MM format |
| `depreciation_amount` | number | Amount for this period |
| `accumulated_total` | number | Running total after this entry |
| `net_book_value` | number | NBV after this entry |
| `status` | select | `pending` · `posted` |

### asset_gl_accounts
| Field | Type | Notes |
|-------|------|-------|
| `code` | text | Account code |
| `name` | text | Account name |
| `account_type` | select | `asset` · `contra_asset` · `expense` |

## Automations

### calculate_depreciation
- **External ID:** `fixed-asset-tracker:calculate_depreciation`
- **Inputs:**
  - `period` (string, required) — YYYY-MM
  - `asset_id` (string, optional) — single asset. If omitted, processes all active assets.
- **What it does:**
  1. Fetches asset(s) — single by ID or all with `status = 'active'`
  2. For each asset, computes monthly depreciation:
     - **Straight-line:** `(cost_basis - salvage_value) / useful_life_months`
     - **Declining balance:** `NBV × (2 / useful_life_months)`, capped so NBV doesn't go below salvage
  3. Creates a `depreciation_entries` record with amount, new accumulated total, and resulting NBV
  4. Updates `accumulated_depreciation` on the asset
  5. If NBV ≤ salvage_value, auto-sets `status: fully_depreciated`
- **Triggered by:** User action (button click in UI) — NOT by hooks

## Hooks

None. This template has no hooks. Depreciation is always user-initiated.

## Agents

| Agent | Directory | Purpose |
|-------|-----------|---------|
| `asset_assistant` | `platform/agents/asset_assistant/` | Asset-aware AI agent |

## Frontend Routes

| Route | File | Key queries |
|-------|------|-------------|
| `/` | `index.tsx` | `getDashboardStats`, `getCategoryBreakdown`, `listAssets(1)` |
| `/assets` | `assets.index.tsx` | `listAssets(page)` with status + category filters |
| `/assets/:id` | `assets.$id.tsx` | Asset record, depreciation entries for that asset, financial summary cards, depreciate + dispose actions |
| `/depreciation` | `depreciation.tsx` | Batch depreciation — pick period, run for all active assets |
| `/settings` | `settings.tsx` | `pbList('asset_gl_accounts')` CRUD |

## Key Files

```
platform/
├── collections/
│   ├── fixed_assets.json
│   ├── depreciation_entries.json
│   └── asset_gl_accounts.json
├── automations/calculate_depreciation/
│   ├── config.json
│   └── run.py
├── agents/asset_assistant/
│   ├── config.json
│   └── system_prompt.md
src/
├── routes/
│   ├── index.tsx                   # Dashboard
│   ├── assets.index.tsx            # Asset list
│   ├── assets.$id.tsx              # Asset detail + schedule + actions
│   ├── depreciation.tsx            # Batch depreciation runner
│   ├── settings.tsx
│   └── how-it-works.tsx
├── lib/queries.ts
├── components/
│   ├── StatusBadge.tsx
│   ├── StatCard.tsx
│   ├── Sidebar.tsx                 # APP_NAME = 'Fixed Asset Tracker'
│   └── ...
scripts/
└── seed-demo.py
```

## Notes

- **depreciation_entries uses `relation`** for `fixed_asset` — enables PocketBase expansion.
- **Period is text, not date** — stored as `YYYY-MM` to avoid day-of-month ambiguity.
- **Disposal is client-side** — no automation. The frontend computes gain/loss and calls `pbUpdate` directly on `fixed_assets`.
- **Batch vs single:** The automation handles both — `asset_id` is optional. The batch depreciation page omits it to run for all active assets.
- **Idempotency concern:** The automation should check if an entry already exists for this asset + period to avoid duplicates.
