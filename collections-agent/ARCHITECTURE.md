# Collections Agent — Technical Reference

## Overview

AR collections management. Monitor overdue customer accounts, AI risk assessment + email drafting, payment recording (oldest-first allocation), audit trail via hooks.

**Customer statuses:** `active` · `contacted` · `promised` · `escalated` · `resolved`

## Collections

### ca_customers
| Field | Type | Notes |
|-------|------|-------|
| `name` | text | Company name |
| `email` | text | Primary email |
| `phone` | text | |
| `contact_name` | text | |
| `status` | select | `active` · `contacted` · `promised` · `escalated` · `resolved` |
| `total_outstanding` | number | Sum of unpaid invoice balances, updated by payment automation |
| `total_paid` | number | Lifetime payments |
| `risk_score` | number | 0–100, set by `ca_assess_risk` |
| `risk_level` | select | `low` · `medium` · `high` |
| `payment_terms` | text | e.g. "Net 30" |
| `next_action` | text | AI-recommended next step |
| `next_follow_up` | date | Set by risk assessment |
| `last_contact_date` | date | |
| `notes` | text | |

### ca_invoices
| Field | Type | Notes |
|-------|------|-------|
| `customer_id` | text | → ca_customers |
| `customer_name` | text | Denormalized for query performance |
| `invoice_number` | text | |
| `amount` | number | Original amount |
| `due_date` | date | |
| `days_overdue` | number | |
| `status` | select | |
| `paid_amount` | number | Total paid against this invoice |
| `balance_remaining` | number | `amount - paid_amount` |
| `reminder_count` | number | |
| `last_reminder_date` | date | |
| `notes` | text | |

### ca_activities
| Field | Type | Notes |
|-------|------|-------|
| `customer_id` | text | → ca_customers |
| `customer_name` | text | Denormalized |
| `activity_type` | select | `email` · `call` · `note` · `system` |
| `subject` | text | |
| `content` | text | Activity body |
| `outcome` | text | |
| `follow_up_date` | date | |

### ca_payments
| Field | Type | Notes |
|-------|------|-------|
| `customer_id` | text | → ca_customers |
| `customer_name` | text | Denormalized |
| `amount` | number | Payment amount |
| `payment_date` | date | |
| `reference` | text | Check number, wire ref, etc. |
| `method` | select | Payment method |
| `applied_invoices` | json | Array of `{ invoice_id, amount }` allocations |
| `notes` | text | |

### ca_reminder_templates
| Field | Type | Notes |
|-------|------|-------|
| `name` | text | Template name |
| `stage` | select | `friendly` · `firm` · `urgent` · `final` |
| `days_overdue_trigger` | number | Min days overdue for this stage |
| `subject_template` | text | Email subject (may contain variables) |
| `body_template` | text | Email body (may contain variables) |
| `enabled` | select | |

### ca_escalation_rules
| Field | Type | Notes |
|-------|------|-------|
| `name` | text | Rule name |
| `min_days_overdue` | number | Threshold |
| `min_amount` | number | Threshold |
| `action_type` | select | |
| `enabled` | select | |

### ca_audit_log
| Field | Type | Notes |
|-------|------|-------|
| `action` | select | `create` · `update` · `delete` |
| `action_category` | select | |
| `action_label` | text | |
| `actor_id` · `actor_name` · `actor_email` | text | |
| `target_collection` | text | |
| `target_record_id` | text | |
| `before_state` | json | |
| `after_state` | json | |

## Automations

### ca_assess_risk
- **External ID:** `collections-agent:ca_assess_risk`
- **Input:** `customer_id` (string)
- **What it does:**
  1. Fetches customer record and all their invoices
  2. Fetches payment history and activities
  3. Sends data to LLM for risk analysis
  4. LLM returns: risk score (0–100), risk level, recommended next action, reasoning
  5. Updates customer's `risk_score`, `risk_level`, `next_action`, `next_follow_up`
  6. Creates a `system` activity logging the assessment
- **Triggered by:** User clicks "Assess Risk" in worklist

### ca_draft_email
- **External ID:** `collections-agent:ca_draft_email`
- **Input:** `customer_id` (string)
- **What it does:**
  1. Fetches customer and their overdue invoices
  2. Determines collection stage from max `days_overdue`:
     - 1–15 days → `friendly`
     - 16–30 days → `firm`
     - 31–60 days → `urgent`
     - 60+ days → `final`
  3. Fetches matching template from `ca_reminder_templates`
  4. Sends template + invoice details to LLM for personalisation
  5. Saves draft as an `email` activity on the customer
  6. Updates customer `status: contacted`, `last_contact_date`
  7. Increments `reminder_count` on affected invoices
- **Triggered by:** User clicks "Draft Email" in worklist

### ca_record_payment
- **External ID:** `collections-agent:ca_record_payment`
- **Inputs:** `customer_id` (string), `amount` (number), `payment_date` (string, optional), `reference` (string, optional), `method` (string, optional)
- **What it does:**
  1. Creates a `ca_payments` record
  2. Fetches customer's unpaid invoices sorted by `due_date` ASC (oldest first)
  3. Allocates payment across invoices oldest-first:
     - For each invoice: apply min(remaining_payment, balance_remaining)
     - Update invoice's `paid_amount` and `balance_remaining`
  4. Records allocations in `applied_invoices` JSON on the payment
  5. Updates customer's `total_outstanding` and `total_paid`
  6. If `total_outstanding == 0`, sets customer `status: resolved`
- **Triggered by:** User submits payment form in customer detail page

## Hooks

### Audit hooks
| Hook | Collection | Event |
|------|-----------|-------|
| `ca_audit_customers_update` | ca_customers | after_update |
| `ca_audit_invoices_create` | ca_invoices | after_create |
| `ca_audit_invoices_update` | ca_invoices | after_update |

All write to `ca_audit_log` with action, actor info, target, and before/after state.

**Note:** No auto-trigger hooks. All three automations are user-initiated (button clicks). This is intentional — collections is a human-in-the-loop workflow.

## Agents

| Agent | Directory | Purpose |
|-------|-----------|---------|
| `collections_assistant` | `platform/agents/collections_assistant/` | Collections-aware AI agent |

## Frontend Routes

| Route | File | Key queries |
|-------|------|-------------|
| `/` | `index.tsx` | `getDashboardStats`, `getAgingBreakdown`, `listCustomers(1)` |
| `/customers` | `customers.index.tsx` | `listCustomers(page)` sorted by risk score, filter tabs by risk level |
| `/customers/:id` | `customers.$id.tsx` | Customer record, 3 tabs: invoices (`pbList('ca_invoices')`), activities (`pbList('ca_activities')`), payments (`pbList('ca_payments')`) |
| `/audit-log` | `audit-log.tsx` | `pbList('ca_audit_log')` with filters |
| `/settings` | `settings.tsx` | `ca_reminder_templates` + `ca_escalation_rules` CRUD |

## Key Files

```
platform/
├── collections/
│   ├── ca_customers.json
│   ├── ca_invoices.json
│   ├── ca_activities.json
│   ├── ca_payments.json
│   ├── ca_reminder_templates.json
│   ├── ca_escalation_rules.json
│   └── ca_audit_log.json
├── automations/
│   ├── ca_assess_risk/
│   │   ├── config.json
│   │   └── run.py
│   ├── ca_draft_email/
│   │   ├── config.json
│   │   └── run.py
│   └── ca_record_payment/
│       ├── config.json
│       └── run.py
├── hooks/
│   ├── ca_audit_customers_update.js
│   ├── ca_audit_invoices_create.js
│   └── ca_audit_invoices_update.js
├── agents/collections_assistant/
│   ├── config.json
│   └── system_prompt.md
src/
├── routes/
│   ├── index.tsx                   # Dashboard
│   ├── customers.index.tsx         # Worklist (risk-sorted)
│   ├── customers.$id.tsx           # Customer detail (3 tabs)
│   ├── customers.tsx               # Layout wrapper
│   ├── audit-log.tsx
│   ├── settings.tsx
│   └── how-it-works.tsx
├── lib/queries.ts
├── components/
│   ├── StatusBadge.tsx
│   ├── StatCard.tsx
│   ├── Sidebar.tsx                 # APP_NAME = 'Collections Agent'
│   └── ...
scripts/
└── seed-demo.py
```

## Notes

- **Denormalized `customer_name`** on invoices, activities, and payments. Avoids JOINs in list queries. Must be kept in sync if customer name changes.
- **`customer_id` is text, not relation** — links are by record ID string, not PocketBase relation type. Query with filter: `customer_id = "abc123"`.
- **`applied_invoices` is JSON** — array of `{ invoice_id, amount }` objects showing how a payment was allocated.
- **Escalation rules are data, not code** — stored in `ca_escalation_rules`, editable in settings UI.
- **Reminder templates use stage-based selection** — the automation picks the template matching the customer's worst overdue bucket, not a specific template ID.
