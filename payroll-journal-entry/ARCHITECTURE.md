# Payroll Journal Entry — Architecture

## Overview

Payroll Journal Entry is a Lumera embedded app for uploading payroll reports, extracting data with AI, and reviewing/posting journal entries. A React frontend runs inside the Lumera platform iframe, backed by collections, hooks, and automations managed through the Lumera CLI.

## System Diagram

```
┌───────────────────────────────────────────────────────────────┐
│  Lumera Platform                                              │
│                                                               │
│  ┌───────────┐   postMessage    ┌──────────────────────────┐  │
│  │  Host UI  │ ◄──────────────► │  App (iframe)            │  │
│  │           │   (auth, init)   │  - Dashboard             │  │
│  └─────┬─────┘                  │  - Payroll run list      │  │
│        │                        │  - Run detail & entries  │  │
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
│  │  - payroll_runs      │  │  - extract_payroll (Python)   │  │
│  │  - journal_entries   │  │    AI document extraction     │  │
│  │  - payroll_gl_accts  │  └───────────────────────────────┘  │
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
- `/` — Dashboard with stat cards (total runs, pending, posted, draft) and recent payroll runs
- `/payroll-runs` — Payroll run list with status and period info
- `/payroll-runs/:id` — Detail view with document preview, journal entry lines, post/reject
- `/how-it-works` — Explanation of the app workflow
- `/settings` — GL account management

## Platform Resources (`platform/`)

Declarative definitions deployed via `lumera apply`.

| Directory                | Purpose                               |
|--------------------------|---------------------------------------|
| `platform/collections/`  | Collection schemas (JSON)             |
| `platform/automations/`  | Background Python scripts             |
| `platform/hooks/`        | Server-side JS on collection events   |

### Automation: `extract_payroll`

Python script that takes a `payroll_run_id`, downloads the attached payroll report, uses AI to extract structured data (employee pay, deductions, taxes), and generates debit/credit journal entry lines written to `journal_entries`.

### Hooks

| Hook               | Trigger                    | Purpose                                    |
|--------------------|----------------------------|--------------------------------------------|
| `trigger_extract`  | `payroll_runs` after_create| Sets status to `processing`, queues extraction |

## Data Flow

1. **User uploads payroll report** → Creates payroll run record with document attachment
2. **`trigger_extract` hook fires** → Sets status to `processing`, queues `extract_payroll` automation
3. **AI extracts data** → Automation reads document, generates journal entry lines (debits/credits)
4. **User reviews** → Run moves to `review` status, user inspects journal entries
5. **User posts/rejects** → Status set to `posted` or `rejected`

## Collections

| Collection           | Purpose                                          |
|----------------------|--------------------------------------------------|
| `payroll_runs`       | Payroll run records with document, status, totals |
| `journal_entries`    | Debit/credit lines linked to a payroll run        |
| `payroll_gl_accounts`| Chart of accounts for payroll journal entries     |

## Scripts (`scripts/`)

Local Python scripts run via `lumera run`. Used for seeding demo data. All scripts should be idempotent.
