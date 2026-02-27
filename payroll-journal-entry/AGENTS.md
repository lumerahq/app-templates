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

## Architecture Files

- **architecture.md** — Technical reference for coding agents. Data models, schemas, relations, hook logic, automation flows, design decisions. An agent starting a new session should understand the full system from this file.
- **ARCHITECTURE.html** — Product brief for the user. This is NOT a system diagram — it's a visual pitch showing what the app will do from the user's perspective. Structure it as:
  1. **Hero**: App name, one-line value prop, who it's for.
  2. **Your workflow**: 3-5 step animated walkthrough of the main user journey (e.g. "Set up drivers → Generate forecasts → Compare scenarios → Share with board"). Each step gets a simple icon/illustration and a sentence. Use subtle CSS animations to reveal steps sequentially.
  3. **What you'll see**: Wireframe-style mockups of key screens (SVG rectangles with placeholder labels showing layout — sidebar, tables, charts, cards). Enough to convey the UX, not pixel-perfect.
  4. **Under the hood** (collapsed `<details>`): The technical system diagram for those who want it.
  
  Keep it clean and minimal. Finance person should look at it and say "yes, that's what I want" or "no, change X."

## Workflow

When the user describes what they want to build:

1. **Read skills first** — Read the matching skill files for API details and patterns.
2. **Design before code** — Write `architecture.md` (technical details) and `ARCHITECTURE.html` (visual overview showing what will be built, how data flows, what the user experience looks like). Then **stop and ask the user to review ARCHITECTURE.html**. Iterate on the design until the user is satisfied before writing any code.
3. **Build incrementally** — Implement in stages. After each stage, summarize what was done and what's next.
4. **Code is source of truth** — Edit files in `platform/`, then deploy with `lumera apply`. Don't edit in the Lumera UI.
5. **Offer to deploy** — After changing platform resources, run `lumera plan` to preview, then offer to run `lumera apply`.
6. **Keep architecture current** — Update both architecture files after significant changes to the data model or flows.
7. **Deploy marker** — When your changes create or modify platform resources that need `lumera apply`, include at the very end of your response: `<!-- DEPLOY: short commit message -->`. Do NOT include for frontend-only changes.

## Key Commands

```bash
lumera plan                            # Preview changes (dry run)
lumera apply                           # Deploy everything
lumera run scripts/seed-demo.py        # Run seed script remotely
lumera status                          # Show sync status
```
