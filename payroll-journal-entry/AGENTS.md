# Payroll Journal Entry

Upload payroll reports (PDF or CSV), AI reads the report and generates debit/credit journal entry lines with account codes and departments, then review for balance and post.

## How It Works

1. User uploads a payroll report → `payroll_runs` record created (`status: draft`)
2. `trigger_extract` hook fires on `after_create` → sets `status: processing`, queues `extract_payroll` automation
3. `extract_payroll` reads the document with AI, creates `journal_entries` records with account codes, debits, credits → sets `status: review`
4. User reviews journal lines, checks that debits = credits, then posts or rejects

**Status flow:** `draft` → `processing` → `review` → `posted` / `rejected`

## Project Structure

```
platform/
├── collections/
│   ├── payroll_runs.json             # Payroll run records (period, pay date, document, status, totals)
│   ├── journal_entries.json          # Journal lines (account_code, department, debit, credit, memo)
│   └── payroll_gl_accounts.json      # GL accounts (code, name, account_type)
├── automations/extract_payroll/      # AI extraction automation (config.json + run.py)
├── hooks/trigger_extract.js          # after_create on payroll_runs → queues extraction
├── agents/payroll_assistant/         # AI agent (config.json + system_prompt.md)
src/
├── routes/
│   ├── index.tsx                     # Dashboard (stats by status, recent runs)
│   ├── payroll-runs.index.tsx        # Payroll run list with status filter tabs
│   ├── payroll-runs.$id.tsx          # Run detail (document + journal entry table + balance check)
│   └── settings.tsx                  # GL account management
├── lib/queries.ts                    # All data fetching and mutation helpers
├── components/                       # Shared UI (StatusBadge, StatCard, etc.)
scripts/seed-demo.py                  # Seeds GL accounts and demo payroll runs
```

**Key external IDs:** `payroll-journal-entry:extract_payroll` (automation), `payroll-journal-entry:trigger_extract` (hook)

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

## Workflow

1. **Read skills first** — Before writing automations, hooks, collections, or agents, read the matching skill file for API details and patterns.
2. **Code is source of truth** — Edit files in `platform/`, then deploy with `lumera apply`. Don't edit in the Lumera UI.
3. **Plan before apply** — Run `lumera plan` to preview changes, then `lumera apply` to deploy.
4. **Offer to deploy** — After changing platform resources, offer to run `lumera apply`.

## Key Commands

```bash
lumera plan                            # Preview changes (dry run)
lumera apply                           # Deploy everything
lumera run scripts/seed-demo.py        # Run seed script remotely
lumera status                          # Show sync status
```
