# Collections Agent — Architecture

## Overview

Collections Agent is a Lumera embedded app for monitoring accounts receivable aging, drafting AI-powered collection emails, and tracking customer touchpoints. A React frontend runs inside the Lumera platform iframe, backed by collections, hooks, and automations managed through the Lumera CLI.

## System Diagram

```
┌───────────────────────────────────────────────────────────────┐
│  Lumera Platform                                              │
│                                                               │
│  ┌───────────┐   postMessage    ┌──────────────────────────┐  │
│  │  Host UI  │ ◄──────────────► │  App (iframe)            │  │
│  │           │   (auth, init)   │  - Dashboard (AR aging)  │  │
│  └─────┬─────┘                  │  - Customer list & detail│  │
│        │                        │  - Audit log             │  │
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
│  │  - customers         │  │  - draft_collection_email     │  │
│  │  - ar_invoices       │  │    (Python, AI-powered)       │  │
│  │  - collection_       │  └───────────────────────────────┘  │
│  │    activities        │                                     │
│  │  - ca_audit_log      │                                     │
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
- `/` — Dashboard with stat cards (outstanding, customers, contacted, escalated), AR aging buckets, priority customers
- `/customers` — Customer list with status and outstanding amounts
- `/customers/:id` — Detail view with open invoices, collection activities, and email drafting
- `/audit-log` — Audit trail of all changes
- `/how-it-works` — Explanation of the app workflow
- `/settings` — App settings

## Platform Resources (`platform/`)

Declarative definitions deployed via `lumera apply`.

| Directory                | Purpose                               |
|--------------------------|---------------------------------------|
| `platform/collections/`  | Collection schemas (JSON)             |
| `platform/automations/`  | Background Python scripts             |
| `platform/hooks/`        | Server-side JS on collection events   |

### Automation: `draft_collection_email`

Python script that takes a `customer_id`, retrieves the customer's open AR invoices, and uses AI (`llm.complete`) to generate a personalized collection email based on the aging data and customer context.

## Data Flow

1. **AR data loaded** → Seed script or CSV import populates `customers` and `ar_invoices`
2. **User views dashboard** → AR aging buckets and priority customers displayed
3. **User selects customer** → Detail page shows open invoices and activity history
4. **User drafts email** → Triggers `draft_collection_email` automation via `createRun`
5. **AI generates email** → Automation reads customer data, drafts personalized email
6. **User sends/edits email** → Activity logged to `collection_activities`
7. **Audit trail** → Changes logged to `ca_audit_log`

## Collections

| Collection              | Purpose                                      |
|-------------------------|----------------------------------------------|
| `customers`             | Customer directory with contact info and status |
| `ar_invoices`           | Open AR invoices linked to customers          |
| `collection_activities` | Collection touchpoints (emails, calls, notes) |
| `ca_audit_log`          | Audit trail for entity changes                |

## Scripts (`scripts/`)

Local Python scripts run via `lumera run`. Used for seeding demo data. All scripts should be idempotent.
