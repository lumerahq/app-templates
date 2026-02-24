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

## Architecture Diagram (`ARCHITECTURE.html`)

Maintain an `ARCHITECTURE.html` file in the project root that gives a human a visual, instant understanding of how the app works. **Regenerate it whenever the data model, automations, hooks, or pages change significantly.**

Requirements:
- **Single self-contained HTML file** — no external dependencies. All CSS and JS inline.
- **SVG diagrams** (not ASCII art) showing the data flow, collection relationships, and automation triggers. Use `<svg>` elements directly in the HTML.
- **Animated flow lines** — Use CSS animations (`stroke-dashoffset`, `@keyframes`) to show data moving through the pipeline (e.g., assess risk → draft email → record payment → resolve). Keep animations subtle and purposeful.
- **Interactive sections** — Clickable/hoverable nodes that highlight related components or show tooltips with details.
- **Color-coded by type** — Collections (blue), automations (purple), hooks (orange), frontend pages (green), external services (gray).
- **Three visual sections**:
  1. **System overview** — High-level boxes showing Frontend → Lumera API → Database / Automation Runtime
  2. **Data flow** — Three animated flows: (a) Risk assessment: User triggers → `ca_assess_risk` automation → updates customer risk score/level/follow-up; (b) Email drafting: User triggers → `ca_draft_email` automation → picks template by stage → AI personalizes → creates activity; (c) Payment: User records → `ca_record_payment` automation → applies oldest-first → updates invoice balances → auto-resolves customer
  3. **Collection relationships** — ER diagram showing `ca_customers` → `ca_invoices`, `ca_customers` → `ca_activities`, `ca_customers` → `ca_payments`, `ca_reminder_templates` → `ca_draft_email`, `ca_escalation_rules`, `ca_audit_log`
- **Clean, modern styling** — White background, rounded corners, subtle shadows, system font stack. Should look professional when opened in a browser.
- **Responsive** — Readable on both desktop and tablet widths.

Generate with: "Create/update the ARCHITECTURE.html file to reflect the current app structure."

## Lumera Concepts

A Lumera app is built from these primitives — all defined as code in `platform/`:

- **Collections** (`platform/collections/*.json`) — Data tables with typed fields. Schemas are JSON files deployed via `lumera apply`. Query with SQL or the records API.
- **Automations** (`platform/automations/*/`) — Python scripts that run on Lumera's servers. Each has a `config.json` (name, inputs) and `run.py`. Triggered from the frontend or by hooks.
- **Hooks** (`platform/hooks/*.js`) — JavaScript snippets that run on collection lifecycle events (`before_create`, `after_update`, etc.). Used for triggering automations, audit logging, or data validation.
- **Agents** (`platform/agents/*/`) — AI chat agents with a `config.json` (name, skills) and `system_prompt.md`. Deploy with `lumera apply agents`.

All resources use **external IDs** in the format `<app-name>:<resource-name>` (auto-derived by the CLI from `package.json` name + directory/file name). Use external IDs when referencing automations from frontend or hooks.

## Skills

Read the skill files in `.claude/skills/` for detailed API docs. Key skills:

<!-- LUMERA_SKILLS_START -->
**lumera-automations** — Create, run, and manage Lumera automations (background Python scripts). Create automations with `POST /api/automations`. Run them with `POST /api/automation-runs`. Monitor via `GET /api/automation-runs/{id}` or stream logs with `GET /api/automation-runs/{id}/logs/live`.

**lumera-collections** — Manage data collections and records via the `lumera_api` tool. Use `GET /api/pb/collections` to list collections, `PUT /api/pb/collections/{name}` to ensure a collection exists with a given schema, and the records API for data operations. Supports filtering, search, and upsert by `external_id`.

**lumera-file-uploads** — Upload and download files using the `lumera_api` tool. Use presigned URLs for uploads, then confirm with the resource endpoint. Download files via `GET .../download-url?name=filename`. Supports sessions, agent runs, documents, and PocketBase files.

**lumera-sdk** — Write Python automations using the Lumera SDK. Use `from lumera import pb` for records, `from lumera import storage` for files, `from lumera import llm` for AI completions, `from lumera import email` for sending emails. Avoid importing from `lumera.sdk` directly.

**lumera-using-lumera** — Build event-driven automation pipelines using collections, hooks, and automations.

**lumera-webhooks** — Receive events from external services (Stripe, GitHub, Slack, etc.) via webhooks. Create endpoints with `webhooks.create()`, get the public URL with `webhooks.url()`, and process events from `lm_event_log`. Trigger automations via hooks on `lm_event_log.after_create`.

**lumera-write-hooks** — Author Lumera collection hooks in JavaScript. Hooks run on lifecycle events (`before_create`, `after_update`, etc.). Manage via `GET/POST/PATCH/DELETE /api/pb/hooks`.

**lumera-agents** — Build and manage AI-powered chat agents with custom system prompts, skills, and tools. Create agents via `POST /api/agents`, invoke synchronously via `POST /api/agents/{id}/invoke`, or stream responses via `POST /api/agents/{id}/chat`.
<!-- LUMERA_SKILLS_END -->

## CLI Cheatsheet

```bash
pnpm dev                              # Start dev server (login first: lumera login)
lumera apply                           # Deploy all (collections, automations, hooks, agents, app)
lumera plan                            # Preview what will change
lumera run scripts/seed-demo.py        # Run seed script
lumera apply app                       # Deploy frontend only
lumera skills update                   # Update skill files to latest
```

## Rules

1. **Read skills first** — Before writing automations, hooks, or collection schemas, read the relevant `.claude/skills/` file for API details and patterns.
2. **Code is source of truth** — Edit files in `platform/` first, then deploy with `lumera apply`. Don't edit in the Lumera UI.
3. **Offer to deploy** — After changing collections, hooks, automations, or agents, offer to run `lumera apply`.
4. **Authenticate first** — User must run `lumera login` before any CLI/SDK commands.
5. **Use Python SDK for debugging** — Quick data inspection: `uv run python -c "from lumera import pb; print(pb.search('ca_customers'))"`

## Frontend Patterns

```typescript
// Data fetching (React Query + Lumera helpers)
import { pbSql, pbList } from '@lumerahq/ui/lib';

const result = await pbSql<Row>({ sql: 'SELECT * FROM ca_customers WHERE status = {:status}', status: 'escalated' });
const items = await pbList<Customer>('ca_customers', { filter: JSON.stringify({ status: "active" }), sort: '-risk_score', perPage: 50 });

// Note: pbSql returns numbers as strings — always cast with Number()

// Running automations from frontend
import { createRun, pollRun } from '@lumerahq/ui/lib';
const run = await createRun({ automationId: 'collections-agent:ca_assess_risk', inputs: { customer_id: id } });
const result = await pollRun(run.id);
```

## Backend Patterns (Python SDK)

```python
from lumera import pb, llm, email

# Records
customers = pb.search("ca_customers", filter='status = "escalated"', per_page=50)
invoices = pb.search("ca_invoices", filter=f'customer = "{customer_id}" && balance > 0', sort='due_date')
pb.create("ca_payments", {"customer": customer_id, "amount": 1000})
pb.update("ca_invoices", invoice_id, {"balance": 0, "status": "paid"})

# AI
result = llm.complete("Assess collection risk for this customer...", json_mode=True)

# Email
email.send(to="customer@example.com", subject="Payment reminder", body=draft)
```
