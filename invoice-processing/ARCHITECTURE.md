# Invoice Processing — Architecture

## Overview

Invoice Processing is a Lumera embedded app for uploading invoices, extracting data with AI, and managing an approval workflow. A React frontend runs inside the Lumera platform iframe, backed by collections, hooks, and automations managed through the Lumera CLI.

## System Diagram

```
┌───────────────────────────────────────────────────────────────┐
│  Lumera Platform                                              │
│                                                               │
│  ┌───────────┐   postMessage    ┌──────────────────────────┐  │
│  │  Host UI  │ ◄──────────────► │  App (iframe)            │  │
│  │           │   (auth, init)   │  - Dashboard             │  │
│  └─────┬─────┘                  │  - Invoice list & detail │  │
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
│  ┌──────────────────┐   ┌──────────────────────────────┐      │
│  │  Tenant Database │   │  Automation Runtime          │      │
│  │  - invoices      │   │  - extract_invoice (Python)  │      │
│  │  - vendors       │   │    AI document extraction    │      │
│  │  - inv_gl_accts  │   └──────────────────────────────┘      │
│  │  - inv_audit_log │                                         │
│  └──────────────────┘                                         │
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
- `/` — Dashboard with stat cards (total, pending, approved, draft) and recent invoices
- `/invoices` — Invoice list with status filters and pagination
- `/invoices/:id` — Detail view with document preview, editable fields, approve/reject
- `/audit` — Audit log of all changes
- `/how-it-works` — Explanation of the app workflow
- `/settings` — GL accounts and vendor management

## Platform Resources (`platform/`)

Declarative definitions deployed via `lumera apply`.

| Directory                | Purpose                               |
|--------------------------|---------------------------------------|
| `platform/collections/`  | Collection schemas (JSON)             |
| `platform/automations/`  | Background Python scripts             |
| `platform/hooks/`        | Server-side JS on collection events   |

### Automation: `extract_invoice`

Python script that takes an `invoice_id`, downloads the attached document, uses AI vision (`llm.extract_text`) to extract structured invoice data (vendor, amounts, line items, dates), and writes the results back to the invoice record.

### Hooks

| Hook                      | Trigger                  | Purpose                               |
|---------------------------|--------------------------|---------------------------------------|
| `trigger_extract`         | `invoices` after_create  | Sets status to `processing`, queues extraction |
| `audit_invoices_*`        | `invoices` CUD events   | Logs changes to `inv_audit_log`       |
| `audit_vendors_*`         | `vendors` CUD events    | Logs changes to `inv_audit_log`       |
| `audit_inv_gl_accounts_*` | `inv_gl_accounts` CUD   | Logs changes to `inv_audit_log`       |

## Data Flow

1. **User uploads invoice** → Creates invoice record with document attachment
2. **`trigger_extract` hook fires** → Sets status to `processing`, queues `extract_invoice` automation
3. **AI extracts data** → Automation reads document, extracts fields, updates invoice with `extracted_data`
4. **User reviews** → Invoice moves to `review` status, user edits fields if needed
5. **User approves/rejects** → Status set to `approved` or `rejected`
6. **Audit trail** → All CUD operations logged via hooks to `inv_audit_log`

## Collections

| Collection       | Purpose                                        |
|------------------|------------------------------------------------|
| `invoices`       | Invoice records with document, status, extracted data |
| `vendors`        | Vendor directory with default GL codes          |
| `inv_gl_accounts`| Chart of accounts for coding invoices           |
| `inv_audit_log`  | Audit trail for all entity changes              |

## Scripts (`scripts/`)

Local Python scripts run via `lumera run`. Used for seeding demo data. All scripts should be idempotent.
