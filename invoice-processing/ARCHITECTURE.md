# Invoice Processing — Technical Reference

## Overview

Upload invoices → AI extracts structured data (vendor, amounts, line items, GL codes) → human reviews → approve/reject. Full audit trail via hooks.

**Status flow:** `draft` → `processing` → `review` → `approved` / `rejected`

## Collections

### ip_invoices
| Field | Type | Notes |
|-------|------|-------|
| `vendor_name` | text | Extracted or manual |
| `invoice_number` | text | |
| `invoice_date` | date | |
| `due_date` | date | |
| `total_amount` | number | |
| `currency` | text | e.g. "USD" |
| `description` | text | |
| `status` | select | `draft` · `processing` · `review` · `approved` · `rejected` |
| `document` | lumera_file | Uploaded PDF/image |
| `extracted_data` | json | Raw AI extraction output |
| `notes` | text | |
| `gl_code` | text | GL account code, suggested from vendor default |

### ip_line_items
| Field | Type | Notes |
|-------|------|-------|
| `invoice_id` | text | → ip_invoices |
| `description` | text | Line item description |
| `quantity` | number | |
| `unit_price` | number | |
| `amount` | number | qty × unit_price |
| `gl_code` | text | GL code for this line |

### ip_vendors
| Field | Type | Notes |
|-------|------|-------|
| `name` | text | Vendor name |
| `default_gl_code` | text | Auto-suggested when this vendor is detected |

### ip_gl_accounts
| Field | Type | Notes |
|-------|------|-------|
| `code` | text | Account code |
| `name` | text | Account name |
| `account_type` | select | `expense` · `liability` · `asset` |

### ip_comments
| Field | Type | Notes |
|-------|------|-------|
| `invoice_id` | text | → ip_invoices |
| `content` | text | Comment body |
| `comment_type` | select | `comment` · `approval` · `rejection` · `system` |
| `author_name` | text | |
| `author_email` | text | |

### ip_audit_log
| Field | Type | Notes |
|-------|------|-------|
| `action` | select | `create` · `update` · `delete` |
| `action_category` | select | |
| `action_label` | text | Human-readable label |
| `actor_id` · `actor_name` · `actor_email` | text | Who made the change |
| `target_collection` | text | Which collection was changed |
| `target_record_id` | text | Which record |
| `before_state` | json | Record state before change |
| `after_state` | json | Record state after change |

## Automations

### extract_invoice
- **External ID:** `invoice-processing:extract_invoice`
- **Input:** `invoice_id` (string)
- **What it does:**
  1. Fetches the ip_invoices record
  2. Downloads the attached document via `storage.download()`
  3. Calls `llm.extract_text()` with the document bytes
  4. Parses vendor, invoice number, dates, amounts, line items from AI response
  5. Creates `ip_line_items` records for each extracted line
  6. Looks up vendor in `ip_vendors` → suggests `default_gl_code`
  7. Updates the invoice with extracted fields, sets `status: review`
- **Triggered by:** `ip_trigger_extract` hook (automatic on invoice creation)

## Hooks

### ip_trigger_extract
- **Collection:** `ip_invoices`
- **Event:** `after_create`
- **External ID:** `invoice-processing:ip_trigger_extract`
- **Logic:** Checks `document` exists and `status == 'draft'`. Sets `status: processing`, finds `extract_invoice` automation by external ID, creates an automation run with `{ invoice_id: record.id }`.

### ip_create_status_comment
- **Collection:** `ip_invoices`
- **Event:** `after_update`
- **Logic:** Compares old vs new status. If changed, creates a system comment in `ip_comments` recording the transition (e.g. "Status changed from processing to review").

### Audit hooks
| Hook | Collection | Event | Notes |
|------|-----------|-------|-------|
| `ip_audit_invoices_create` | ip_invoices | after_create | Logs creation |
| `ip_audit_invoices_update` | ip_invoices | after_update | Logs changes with before/after |
| `ip_audit_vendors_create` | ip_vendors | after_create | |
| `ip_audit_vendors_update` | ip_vendors | after_update | |
| `ip_audit_vendors_delete` | ip_vendors | after_delete | |
| `ip_audit_gl_accounts_create` | ip_gl_accounts | after_create | |
| `ip_audit_gl_accounts_update` | ip_gl_accounts | after_update | |
| `ip_audit_gl_accounts_delete` | ip_gl_accounts | after_delete | |
| `ip_audit_line_items_create` | ip_line_items | after_create | |
| `ip_audit_comments_create` | ip_comments | after_create | |

All audit hooks write to `ip_audit_log` with the action, actor info (from `ctx.user`), target collection/record, and before/after state.

## Agents

| Agent | Directory | Purpose |
|-------|-----------|---------|
| `invoice_assistant` | `platform/agents/invoice_assistant/` | Invoice-aware AI agent |

## Frontend Routes

| Route | File | Key queries |
|-------|------|-------------|
| `/` | `index.tsx` | `getDashboardStats`, `getStatusPipeline`, `getSpendByVendor`, `getSpendByGlCode`, `getInvoiceAging`, `listInvoices` |
| `/invoices` | `invoices.index.tsx` | `listInvoices(page)` with status filter |
| `/invoices/:id` | `invoices.$id.tsx` | `getInvoice(id)`, line items, comments, file preview via `getDownloadUrl` |
| `/settings` | `settings.tsx` | `pbList('ip_vendors')`, `pbList('ip_gl_accounts')` |
| `/audit` | `audit.tsx` | `pbList('ip_audit_log')` with filters |

## Key Files

```
platform/
├── collections/
│   ├── ip_invoices.json
│   ├── ip_line_items.json
│   ├── ip_vendors.json
│   ├── ip_gl_accounts.json
│   ├── ip_comments.json
│   └── ip_audit_log.json
├── automations/extract_invoice/
│   ├── config.json
│   └── run.py
├── hooks/
│   ├── ip_trigger_extract.js
│   ├── ip_create_status_comment.js
│   └── ip_audit_*.js              # 10 audit hooks
├── agents/invoice_assistant/
│   ├── config.json
│   └── system_prompt.md
src/
├── routes/
│   ├── index.tsx                   # Dashboard
│   ├── invoices.index.tsx          # Invoice list
│   ├── invoices.$id.tsx            # Invoice detail
│   ├── invoices.tsx                # Layout wrapper
│   ├── settings.tsx
│   ├── audit.tsx
│   └── how-it-works.tsx
├── lib/queries.ts                  # All query functions and mutations
├── components/
│   ├── InvoiceStatusBadge.tsx
│   ├── StatCard.tsx
│   ├── Sidebar.tsx                 # APP_NAME = 'Invoice Processing'
│   └── ...
scripts/
└── seed-demo.py
```
