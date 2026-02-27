# Invoice Processing

Upload invoice documents (PDF, images), AI extracts structured data (vendor, amounts, line items, GL codes), then review and approve. Full audit trail and activity comments.

## How It Works

1. User uploads a document → `ip_invoices` record created (`status: draft`)
2. `ip_trigger_extract` hook fires on `after_create` → sets `status: processing`, queues `extract_invoice` automation
3. `extract_invoice` reads the document with `llm.extract_text()`, populates invoice fields, creates `ip_line_items`, sets `status: review`
4. `ip_create_status_comment` hook records every status change in `ip_comments`
5. User reviews extracted data, edits mistakes, approves or rejects

**Status flow:** `draft` → `processing` → `review` → `approved` / `rejected`

## Project Structure

```
platform/
├── collections/
│   ├── ip_invoices.json          # Invoice records (document, vendor, amounts, status)
│   ├── ip_vendors.json           # Vendor directory with default GL codes
│   ├── ip_gl_accounts.json       # Chart of accounts
│   ├── ip_line_items.json        # Line items per invoice (desc, qty, amount, gl_code)
│   ├── ip_comments.json          # Activity timeline (comments, approvals, system events)
│   └── ip_audit_log.json         # Audit trail for all entity changes
├── automations/extract_invoice/  # AI extraction automation (config.json + run.py)
├── hooks/
│   ├── ip_trigger_extract.js     # after_create on ip_invoices → queues extraction
│   ├── ip_create_status_comment.js  # Logs status changes as comments
│   └── ip_audit_*.js             # Audit logging hooks for all collections
├── agents/invoice_assistant/     # AI agent (config.json + system_prompt.md)
src/
├── routes/
│   ├── index.tsx                 # Dashboard (stats, pipeline, recent invoices)
│   ├── invoices.index.tsx        # Invoice list with status filter tabs
│   ├── invoices.$id.tsx          # Invoice detail (document preview + editable form)
│   ├── settings.tsx              # Vendor and GL account management
│   └── audit.tsx                 # Audit log viewer
├── lib/queries.ts                # All data fetching and mutation helpers
├── components/                   # Shared UI (StatusBadge, StatCard, FileDropzone, etc.)
scripts/seed-demo.py              # Seeds vendors, GL accounts, and demo invoices
```

**Key external IDs:** `invoice-processing:extract_invoice` (automation), `invoice-processing:ip_trigger_extract` (hook)

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

### Phase 1: Design
1. **Read skills first** — Read the matching skill files for API details and patterns.
2. **Design before code** — Write `architecture.md` (technical details) and `ARCHITECTURE.html` (visual product brief). Then **stop and ask the user to review ARCHITECTURE.html**. Iterate until satisfied.

### Phase 2: Interactive Prototype
3. **Build a clickable prototype** — Build every screen with mock data so the user can open the Preview tab and experience the real app. This means:
   - Create a `src/lib/mock-data.ts` file with realistic dummy data matching the domain (real account names, plausible numbers, 12+ months of data, multiple scenarios).
   - Build all routes and components using this mock data — dashboard, editors, tables, charts, detail views. Full navigation, real layouts, working interactions (tabs, filters, sorts, modals).
   - Add a small **status banner** on each page: a subtle top bar or badge showing `✅ Live in prototype` for features that are fully represented, and `🔜 Connects to backend` for actions that will work once collections and automations are deployed (e.g. "Save" buttons, "Run forecast" actions).
   - The prototype should feel like a finished app with frozen data — not a wireframe.
4. **Stop and ask for feedback** — Tell the user to open the **Preview tab** in Studio. The dev server starts automatically when they open it — you do NOT need to run `pnpm dev` or start any server yourself. Iterate on layout, columns, navigation, and flows until they approve.

### Phase 3: Build
5. **Build the backend** — Create collection schemas matching the mock data shapes, write automations and hooks, deploy with `lumera apply`, create a seed script with the mock data.
6. **Connect the frontend** — Replace mock data imports with API calls (`pbSql`, `pbList`, `createRun`). The layouts stay the same — only the data source changes.
7. **Code is source of truth** — Edit files in `platform/`, then deploy with `lumera apply`. Don't edit in the Lumera UI.
8. **Keep architecture current** — Update both architecture files after significant changes.
9. **Commit your work** — After completing each phase or making significant changes, commit to git: `git add -A && git commit -m "descriptive message"`. This persists your work — the sandbox filesystem is ephemeral and may be recycled.
10. **Deploy marker** — When your changes create or modify platform resources that need `lumera apply`, include at the very end of your response: `<!-- DEPLOY: short commit message -->`. Do NOT include for frontend-only changes.

## Key Commands

```bash
lumera plan                            # Preview changes (dry run)
lumera apply                           # Deploy everything
lumera run scripts/seed-demo.py        # Run seed script remotely
lumera status                          # Show sync status
```
