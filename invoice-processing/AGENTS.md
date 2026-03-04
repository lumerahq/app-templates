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

## Workflow

When the user describes what they want to build:

### Step 1: Plan
1. **Read skills first** — Read the matching skill files for API details and patterns.
2. **Write `plan.md`** — This is your plan. Start from the **simplest thing that works** — one collection, one screen, one feature. Then list incremental steps that layer on complexity. Each step should be a complete horizontal slice (collection + backend logic + UI). Example:
   - Step 1: A `forecasts` collection with a basic table view.
   - Step 2: Add a `scenarios` collection, link to forecasts, add a scenario picker.
   - Step 3: Add a comparison chart across scenarios.
   - Step 4: Add an automation that generates forecasts from driver assumptions.
3. **Stop and ask the user to review the plan.** Iterate until they approve. The plan is a conversation — they may reorder steps, drop features, or add ones you didn't think of.

### Step 2: Build (one slice at a time)
4. **Build horizontally** — Pick the first step from the plan. Build the full slice: collection schema → `lumera apply` → seed data → UI route/components → commit. Each slice should be deployable and usable on its own.
5. **Stop and ask for feedback** — Tell the user to open the **Preview tab** to see the app. The dev server starts automatically — you do NOT need to run `pnpm dev` or start any server. Iterate on the slice until they're happy.
6. **Repeat** — Move to the next step in the plan. Update `plan.md` as the design evolves.

### Rules
7. **Code is source of truth** — Edit files in `platform/`, then deploy with `lumera apply`. Don't edit in the Lumera UI.
8. **Keep `plan.md` current** — Update it after each slice so a new session can pick up where you left off.
9. **Commit and push** — After each slice or significant change: `git add -A && git commit -m "descriptive message" && git push`. The sandbox is ephemeral — uncommitted work is lost if recycled.
10. **Deploy marker** — When your changes need `lumera apply`, include at the end of your response: `<!-- DEPLOY: short commit message -->`. Skip for frontend-only changes.

## File Artifacts

When you create a file the user should **see** in chat (HTML pages, SVG graphics, CSV exports, PDFs, images, charts, etc.), call `create_artifact` with the file path after writing it. This uploads the file and renders an inline preview or download card in the chat. Without this step, the file exists in the sandbox but the user cannot see it.

Always call `create_artifact` for: `.html`, `.svg`, `.csv`, `.json`, `.xml`, `.md`, `.txt`, `.pdf`, `.png`, `.jpg`, `.gif`, `.xlsx`, `.docx`, `.pptx`, `.zip` — any file the user asked to see or download.

## Python

Python 3.14 is pre-installed with common data packages (pandas, numpy, matplotlib, pdfplumber, openpyxl, etc.). To install additional packages use `uv add <package>` (preferred) or `pip install <package>`.

## Key Commands

```bash
lumera plan                            # Preview changes (dry run)
lumera apply                           # Deploy everything
lumera run scripts/seed-demo.py        # Run seed script remotely
lumera status                          # Show sync status
```
