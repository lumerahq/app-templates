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
│  │           │   (auth, init)   │  - Dashboard (charts)    │  │
│  └─────┬─────┘                  │  - Invoice list & detail │  │
│        │                        │  - Line items & GL coding│  │
│        │  REST API              │  - Comments & activity   │  │
│        ▼                        │  - Audit log             │  │
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
│  │  - ip_invoices   │   │  - extract_invoice (Python)  │      │
│  │  - ip_vendors    │   │    AI document extraction    │      │
│  │  - ip_gl_accounts│   │    + line item creation      │      │
│  │  - ip_line_items │   │    + GL code suggestion      │      │
│  │  - ip_comments   │   └──────────────────────────────┘      │
│  │  - ip_audit_log  │                                         │
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
- `/` — Dashboard with stat cards, status pipeline chart, vendor/GL spend charts, invoice aging, and recent invoices
- `/invoices` — Invoice list with search, sort, status filters, and pagination
- `/invoices/:id` — Detail view with document preview, editable fields, line items table, GL coding, activity timeline, and approve/reject with comments
- `/audit` — Audit log of all changes (filterable by invoice, vendor, GL account, line item, comment)
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

Python script that takes an `invoice_id`, downloads the attached document, uses AI vision (`llm.extract_text`) to extract structured invoice data (vendor, amounts, line items, dates), writes the results back to the invoice record, creates `ip_line_items` records for each extracted line item, and suggests a GL code based on the vendor's default.

### Hooks

| Hook                        | Trigger                    | Purpose                                    |
|-----------------------------|----------------------------|--------------------------------------------|
| `ip_trigger_extract`        | `ip_invoices` after_create | Sets status to `processing`, queues extraction |
| `ip_create_status_comment`  | `ip_invoices` after_update | Creates system comment when status changes  |
| `ip_audit_invoices_*`       | `ip_invoices` CUD events   | Logs changes to `ip_audit_log`             |
| `ip_audit_vendors_*`        | `ip_vendors` CUD events    | Logs changes to `ip_audit_log`             |
| `ip_audit_gl_accounts_*`    | `ip_gl_accounts` CUD       | Logs changes to `ip_audit_log`             |
| `ip_audit_line_items_create`| `ip_line_items` after_create| Logs line item creation to `ip_audit_log`  |
| `ip_audit_comments_create`  | `ip_comments` after_create | Logs comment creation to `ip_audit_log`    |

## Data Flow

1. **User uploads invoice** → Creates invoice record with document attachment
2. **`trigger_extract` hook fires** → Sets status to `processing`, queues `extract_invoice` automation
3. **AI extracts data** → Automation reads document, extracts fields and line items, suggests GL code, updates invoice, creates `ip_line_items` records
4. **`create_status_comment` hook fires** → Records status change in `ip_comments`
5. **User reviews** → Invoice moves to `review` status, user edits fields, line items, and GL codes
6. **User approves/rejects** → Status set to `approved` or `rejected`, comment recorded with note/reason
7. **Audit trail** → All CUD operations logged via hooks to `ip_audit_log`

## Collections

| Collection        | Purpose                                                  |
|-------------------|----------------------------------------------------------|
| `ip_invoices`     | Invoice records with document, status, extracted data, GL code |
| `ip_vendors`      | Vendor directory with default GL codes                    |
| `ip_gl_accounts`  | Chart of accounts for coding invoices and line items      |
| `ip_line_items`   | Individual line items per invoice (description, qty, price, GL code) |
| `ip_comments`     | Activity timeline per invoice (comments, approvals, rejections, system events) |
| `ip_audit_log`    | Audit trail for all entity changes across all collections |

## Scripts (`scripts/`)

Local Python scripts run via `lumera run`. Used for seeding demo data. All scripts should be idempotent.
