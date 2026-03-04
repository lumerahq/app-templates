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

Follow the user's lead. If they tell you exactly what to build, build it. The workflow below is the default when they describe a goal and leave the approach to you.

### Step 1: Plan
1. **Read skills first** — Read the matching skill files for API details and patterns.
2. **Discuss the plan** — Start from the **simplest thing that works** — one collection, one screen, one feature. Propose incremental steps that layer on complexity. Each step should be a complete horizontal slice (collection + backend logic + UI).
3. **Stop and ask the user to approve.** Iterate until they're happy with the plan. They may reorder steps, drop features, or add ones you didn't think of.

### Step 2: Build (one slice at a time)
4. **Build horizontally** — Pick the first step. Build the full slice: collection schema → `lumera apply` → seed data → UI route/components → commit. Each slice should be deployable and usable on its own.
5. **Stop and ask for feedback** — Tell the user to open the **Preview tab** to see the app. The dev server starts automatically — you do NOT need to run `pnpm dev` or start any server. Iterate on the slice until they're happy.
6. **Repeat** — Move to the next step. Build, deploy, get feedback.

### Rules
7. **Code is source of truth** — Edit files in `platform/`, then deploy with `lumera apply`. Don't edit in the Lumera UI.
8. **Keep `architecture.md` current** — After each slice, update `architecture.md` with what was built: data models, relationships, hook logic, design decisions. This is the project knowledge base — a new session should understand the full system from this file alone.
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
