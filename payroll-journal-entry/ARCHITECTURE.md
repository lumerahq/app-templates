# Payroll Journal Entry — Technical Reference

## Overview

Upload payroll reports (PDF/CSV) → AI generates debit/credit journal entry lines → human reviews for balance → post or reject.

**Status flow:** `draft` → `processing` → `review` → `posted` / `rejected`

## Collections

### payroll_runs
| Field | Type | Notes |
|-------|------|-------|
| `pay_period_start` | date | |
| `pay_period_end` | date | |
| `pay_date` | date | |
| `document` | lumera_file | Uploaded payroll report |
| `status` | select | `draft` · `processing` · `review` · `posted` · `rejected` |
| `total_debits` | number | Computed by automation |
| `total_credits` | number | Computed by automation |
| `notes` | text | |
| `extracted_data` | json | Raw AI extraction output |

### journal_entries
| Field | Type | Notes |
|-------|------|-------|
| `payroll_run` | relation | → payroll_runs |
| `account_code` | text | GL account code |
| `account_name` | text | GL account name |
| `department` | text | |
| `debit_amount` | number | 0 if credit line |
| `credit_amount` | number | 0 if debit line |
| `memo` | text | |

### payroll_gl_accounts
| Field | Type | Notes |
|-------|------|-------|
| `code` | text | Account code |
| `name` | text | Account name |
| `account_type` | select | `expense` · `liability` · `asset` |

## Automations

### extract_payroll
- **External ID:** `payroll-journal-entry:extract_payroll`
- **Input:** `payroll_run_id` (string)
- **What it does:**
  1. Fetches the payroll_runs record
  2. Downloads the attached document via `storage.download()`
  3. Calls `llm.extract_text()` — handles both PDF (vision) and CSV (text) formats
  4. Parses journal entry lines from AI response (account code, name, department, DR, CR, memo)
  5. Creates `journal_entries` records for each line
  6. Computes `total_debits` and `total_credits`, updates the payroll run
  7. Sets `status: review`
- **Triggered by:** `trigger_extract` hook (automatic on run creation)

## Hooks

### trigger_extract
- **Collection:** `payroll_runs`
- **Event:** `after_create`
- **External ID:** `payroll-journal-entry:trigger_extract`
- **Logic:** Checks `document` exists and `status == 'draft'`. Sets `status: processing`, finds `extract_payroll` automation by external ID, creates a run with `{ payroll_run_id: record.id }`.

## Agents

| Agent | Directory | Purpose |
|-------|-----------|---------|
| `payroll_assistant` | `platform/agents/payroll_assistant/` | Payroll-aware AI agent |

## Frontend Routes

| Route | File | Key queries |
|-------|------|-------------|
| `/` | `index.tsx` | `getDashboardStats`, `listPayrollRuns(1)` |
| `/payroll-runs` | `payroll-runs.index.tsx` | `listPayrollRuns(page)` with status filter |
| `/payroll-runs/:id` | `payroll-runs.$id.tsx` | Run record, `journal_entries` for that run, file preview, balance check (`total_debits == total_credits`) |
| `/settings` | `settings.tsx` | `pbList('payroll_gl_accounts')` CRUD |

## Key Files

```
platform/
├── collections/
│   ├── payroll_runs.json
│   ├── journal_entries.json
│   └── payroll_gl_accounts.json
├── automations/extract_payroll/
│   ├── config.json
│   └── run.py
├── hooks/
│   └── trigger_extract.js
├── agents/payroll_assistant/
│   ├── config.json
│   └── system_prompt.md
src/
├── routes/
│   ├── index.tsx                   # Dashboard
│   ├── payroll-runs.index.tsx      # Run list
│   ├── payroll-runs.$id.tsx        # Run detail + JE table + balance check
│   ├── payroll-runs.tsx            # Layout wrapper
│   ├── settings.tsx
│   └── how-it-works.tsx
├── lib/queries.ts
├── components/
│   ├── StatusBadge.tsx
│   ├── StatCard.tsx
│   ├── Sidebar.tsx                 # APP_NAME = 'Payroll Journal Entry'
│   └── ...
scripts/
└── seed-demo.py
```

## Notes

- **Balance validation:** The detail page highlights when `total_debits ≠ total_credits`. This is a UI check — there's no server-side enforcement.
- **journal_entries uses `relation` type** for `payroll_run` (not text ID like invoice-processing uses). This enables PocketBase relation expansion in queries.
- **No audit hooks** in this template — simpler than invoice-processing.
