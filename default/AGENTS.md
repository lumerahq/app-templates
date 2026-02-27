# Default App

Blank starter template with a dashboard, one example collection (`example_items`), and a seed script. Use this as a starting point — replace the example collection with your own domain.

## Project Structure

```
platform/
├── collections/example_items.json   # Example collection schema
├── automations/                     # Python automations (config.json + run.py per automation)
├── hooks/                           # JavaScript hooks on collection lifecycle events
├── agents/assistant/                # AI agent (config.json + system_prompt.md)
src/
├── routes/index.tsx                 # Dashboard
├── routes/settings.tsx              # Settings page
├── lib/queries.ts                   # Data fetching helpers
├── components/                      # Shared UI components
scripts/seed-demo.py                 # Seed data script
```

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
- **ARCHITECTURE.html** — Human-facing visual overview. Self-contained HTML with product overview, data flow diagrams, system architecture visuals. Built for humans to review in a browser.

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
