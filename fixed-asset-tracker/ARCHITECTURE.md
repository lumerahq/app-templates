# Fixed Asset Tracker — Architecture

## Overview

Fixed Asset Tracker is a Lumera embedded app for tracking fixed assets, calculating depreciation, and managing disposals with automated journal entries. A React frontend runs inside the Lumera platform iframe, backed by collections, hooks, and automations managed through the Lumera CLI.

## System Diagram

```
┌───────────────────────────────────────────────────────────────┐
│  Lumera Platform                                              │
│                                                               │
│  ┌───────────┐   postMessage    ┌──────────────────────────┐  │
│  │  Host UI  │ ◄──────────────► │  App (iframe)            │  │
│  │           │   (auth, init)   │  - Dashboard (NBV, cats) │  │
│  └─────┬─────┘                  │  - Asset list & detail   │  │
│        │                        │  - Depreciation schedule │  │
│        │  REST API              └───────────┬──────────────┘  │
│        ▼                                    ▼                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Lumera API                                            │   │
│  │  - Collections (CRUD, SQL, search)                     │   │
│  │  - Automations (run, poll, cancel)                     │   │
│  │  - File storage (upload, download)                     │   │
│  └─────────┬────────────────────────┬─────────────────────┘   │
│            │                        │                         │
│            ▼                        ▼                         │
│  ┌──────────────────────┐  ┌───────────────────────────────┐  │
│  │  Tenant Database     │  │  Automation Runtime           │  │
│  │  - fixed_assets      │  │  - calculate_depreciation     │  │
│  │  - depreciation_     │  │    (Python)                   │  │
│  │    entries           │  └───────────────────────────────┘  │
│  │  - asset_gl_accounts │                                     │
│  └──────────────────────┘                                     │
└───────────────────────────────────────────────────────────────┘
```

## Frontend (`src/`)

React app using TanStack Router (file-based routing) and TanStack Query for data fetching. Embedded in Lumera via iframe with postMessage bridge for authentication.

| Directory        | Purpose                              |
|------------------|--------------------------------------|
| `src/routes/`    | Pages — file names map to URL paths  |
| `src/components/`| Shared React components              |
| `src/lib/`       | API helpers, query functions          |
| `src/main.tsx`   | App entry — auth bridge, router init |

**Key pages:**
- `/` — Dashboard with NBV summary, category breakdown, depreciation progress, recent assets
- `/assets` — Asset list with status, category, cost, and NBV
- `/assets/:id` — Detail view with asset info, depreciation history, disposal management
- `/depreciation` — Run depreciation for a period, view schedule
- `/how-it-works` — Explanation of the app workflow
- `/settings` — GL account management

## Platform Resources (`platform/`)

Declarative definitions deployed via `lumera apply`.

| Directory                | Purpose                               |
|--------------------------|---------------------------------------|
| `platform/collections/`  | Collection schemas (JSON)             |
| `platform/automations/`  | Background Python scripts             |
| `platform/hooks/`        | Server-side JS on collection events   |

### Automation: `calculate_depreciation`

Python script that takes a `period` (YYYY-MM) and optional `asset_id`. Calculates monthly depreciation for one or all active assets based on their depreciation method (straight-line), cost basis, salvage value, and useful life. Creates `depreciation_entries` and updates `accumulated_depreciation` on each asset.

## Data Flow

1. **Assets imported** → Seed script or CSV import populates `fixed_assets`
2. **User views dashboard** → NBV summary, category breakdown, depreciation progress
3. **User runs depreciation** → Triggers `calculate_depreciation` automation with a period
4. **Automation calculates** → Creates depreciation entries, updates accumulated totals
5. **User reviews entries** → Depreciation schedule shows per-asset, per-period detail
6. **Asset disposal** → User records disposal date and proceeds, status set to `disposed`

## Collections

| Collection             | Purpose                                           |
|------------------------|---------------------------------------------------|
| `fixed_assets`         | Asset register with cost, depreciation method, status |
| `depreciation_entries` | Monthly depreciation records linked to assets     |
| `asset_gl_accounts`    | Chart of accounts for asset journal entries       |

## Scripts (`scripts/`)

Local Python scripts run via `lumera run`. Used for seeding demo data. All scripts should be idempotent.
