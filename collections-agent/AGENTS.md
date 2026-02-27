# Collections Agent

AR collections management app. Monitor overdue customer accounts, use AI to assess risk and draft collection emails, record payments (auto-applied oldest-first), and track all changes in an audit log.

## How It Works

1. Dashboard shows total outstanding, AR aging breakdown, and priority customers
2. Worklist page ranks customers by AI risk score — one-click buttons to assess risk or draft email
3. `ca_assess_risk` automation analyzes invoices + payment history → returns risk score, level, recommended action
4. `ca_draft_email` automation picks the right tone (friendly/firm/urgent/final) based on overdue days, personalizes with invoice details
5. `ca_record_payment` automation applies payment oldest-first across invoices, auto-resolves customer when fully paid
6. Audit hooks on `ca_customers` and `ca_invoices` log all changes with before/after state

**Customer statuses:** `active` / `contacted` / `promised` / `escalated` / `resolved`

## Project Structure

```
platform/
├── collections/
│   ├── ca_customers.json             # Customer accounts (name, balance, risk score, status)
│   ├── ca_invoices.json              # Invoices (amount, due date, balance, days overdue)
│   ├── ca_activities.json            # Activity log (emails, calls, notes per customer)
│   ├── ca_payments.json              # Payment records
│   ├── ca_reminder_templates.json    # Email templates by stage (friendly → final)
│   ├── ca_escalation_rules.json      # Escalation rules (days overdue, amount thresholds)
│   └── ca_audit_log.json             # Audit trail for all entity changes
├── automations/
│   ├── ca_assess_risk/               # AI risk assessment (config.json + run.py)
│   ├── ca_draft_email/               # AI email drafting (config.json + run.py)
│   └── ca_record_payment/            # Payment recording (config.json + run.py)
├── hooks/
│   ├── ca_audit_customers_update.js  # Audit log for customer changes
│   ├── ca_audit_invoices_create.js   # Audit log for new invoices
│   └── ca_audit_invoices_update.js   # Audit log for invoice changes
├── agents/collections_assistant/     # AI agent (config.json + system_prompt.md)
src/
├── routes/
│   ├── index.tsx                     # Dashboard (outstanding, aging, priority customers)
│   ├── customers.index.tsx           # Worklist sorted by risk score
│   ├── customers.$id.tsx             # Customer detail (tabs: invoices, activities, payments)
│   ├── settings.tsx                  # Reminder templates and escalation rules
│   └── audit-log.tsx                 # Audit log viewer
├── lib/queries.ts                    # All data fetching and mutation helpers
├── components/                       # Shared UI (StatusBadge, StatCard, etc.)
scripts/seed-demo.py                  # Seeds customers, invoices, activities, payments
```

**Key external IDs:** `collections-agent:ca_assess_risk`, `collections-agent:ca_draft_email`, `collections-agent:ca_record_payment` (automations)

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
- **ARCHITECTURE.html** — Human-facing docs. Self-contained HTML with product overview, data flow diagrams, system architecture visuals.

**Write `architecture.md` before writing code.** When the user describes what they want to build, first propose a plan and write it to `architecture.md` — which collections, hooks, automations, and pages are needed and how they connect. Then implement. Update `architecture.md` after any significant changes to the data model or flows.

## Workflow

1. **Read skills first** — Before writing automations, hooks, collections, or agents, read the matching skill file for API details and patterns.
2. **Architecture first** — Propose a plan, write `architecture.md`, then implement. Update it after significant changes.
3. **Code is source of truth** — Edit files in `platform/`, then deploy with `lumera apply`. Don't edit in the Lumera UI.
4. **Plan before apply** — Run `lumera plan` to preview changes, then `lumera apply` to deploy.
5. **Offer to deploy** — After changing platform resources, offer to run `lumera apply`.
6. **Deploy marker** — When your changes create or modify platform resources that need `lumera apply`, include at the very end of your response: `<!-- DEPLOY: short commit message -->`. Do NOT include for frontend-only changes.

## Key Commands

```bash
lumera plan                            # Preview changes (dry run)
lumera apply                           # Deploy everything
lumera run scripts/seed-demo.py        # Run seed script remotely
lumera status                          # Show sync status
```
