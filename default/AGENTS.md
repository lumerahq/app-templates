# {{projectTitle}}

A Lumera app built with collections, automations, hooks, and a React frontend.

## Project Structure

```
platform/
├── collections/       # Collection schemas (JSON) — deployed via lumera apply
├── automations/       # Python automations (config.json + run.py per automation)
├── hooks/             # JavaScript hooks on collection lifecycle events
src/
├── routes/index.tsx   # Home page
├── lib/queries.ts     # Data fetching helpers
├── components/        # Shared UI components
├── components/ui/     # shadcn UI primitives (installed via MCP)
scripts/               # Utility scripts (seed data, migrations, etc.)
```

## Lumera Concepts

A Lumera app is built from these primitives — all defined as code in `platform/`:

- **Collections** (`platform/collections/*.json`) — Data tables with typed fields. Deployed via `lumera apply`.
- **Automations** (`platform/automations/*/`) — Python scripts that run on Lumera's servers. Each has a `config.json` and `run.py`.
- **Hooks** (`platform/hooks/*.js`) — JavaScript on collection lifecycle events (`before_create`, `after_update`, etc.).
- **Webhooks** — Receive events from external services (Stripe, GitHub, etc.). Events land in `lm_event_log`; process them with hooks or automations.
- **Mailbox** — Each tenant gets an email address. Inbound emails are persisted to `lm_mailbox_messages` — use hooks to trigger automations on new mail.
- **Email** — Send transactional emails from automations via `from lumera import email`. Logged to `lm_email_logs`.

All resources use **external IDs** in the format `<app-name>:<resource-name>` (auto-derived from `package.json` name + directory/file name).

## Project Namespacing

**All collection names are automatically namespaced by project.** Always use bare names (e.g. `orders`, not `myproject__orders`) everywhere — in collection JSON files, Python SDK calls, JavaScript hooks, and frontend queries. The platform resolves bare names to the project-scoped version transparently.

- `pb.ensure_collection("orders", ...)` → stored as `{project}__orders`
- `pb.search("orders", ...)` → resolves to `{project}__orders`
- `ctx.dao.find("orders", ...)` → resolves to `{project}__orders`
- `pbList("orders", ...)` in frontend → resolves via `X-Lumera-Project` header

**Never manually prefix collection names with `{project}__`.** Two projects can each have an `orders` collection — they are fully isolated.

For detailed technical reference (data models, relationships, design decisions), see [architecture.md](architecture.md).

## UI Components

**Use shadcn components for all UI.** A shadcn MCP server is available in this project. Use it to browse, search, and install components instead of hand-coding UI primitives.

```
mcp({ search: "button" })                    # Find components
mcp({ search: "card" })                      # Find card, dialog, etc.
npx shadcn@latest add button card dialog     # Install components
```

shadcn components install into `src/components/ui/` and are fully editable. The project includes a `components.json` that configures paths and aliases.

**`@lumerahq/ui`** provides Lumera platform utilities — use it only for:
- `@lumerahq/ui/lib` — `cn`, `pbList`, `pbSql`, `pbCreate`, `pbUpdate`, `pbDelete`, `isEmbedded`, `onInitMessage`, `postReadyMessage`
- `@lumerahq/ui/hooks` — `useSqlTable`, `useLumeraUser`, `useFileUpload`
- `@lumerahq/ui/styles.css` — Base CSS theme with Tailwind vars

Do **not** import UI primitives (Button, Card, Dialog, etc.) from `@lumerahq/ui/components`. Install them via shadcn instead.

## Frontend API Calls

Custom apps run in an **iframe**. **Always use the `@lumerahq/ui` bridge for API calls.** Never use raw `fetch()` against Lumera API endpoints.

```ts
// ✅ Correct — uses postMessage bridge, no CORS issues
import { pbSql, pbList, pbCreate, pbUpdate, pbDelete } from '@lumerahq/ui/lib';

// CRUD
const records = await pbList('orders', { filter: JSON.stringify({ status: "pending" }) });
await pbCreate('orders', { amount: 100 });
await pbUpdate('orders', recordId, { status: 'done' });
await pbDelete('orders', recordId);

// ❌ WRONG — direct fetch will fail with CORS errors
fetch('/api/pb/sql', { method: 'POST', body: JSON.stringify({ sql: '...' }) });
fetch('https://app.lumerahq.com/api/pb/sql', ...);
```

**Why:** The bridge sends requests to the parent window via `postMessage`. The parent makes the actual API call on its own origin — no CORS, and auth is handled automatically.

**Rules:**
- Always import from `@lumerahq/ui/lib` — never write a custom `apiFetch` with raw `fetch()`
- Token is not needed — the bridge handles auth via the parent session
- `X-Lumera-Project` header is not needed — the parent adds it automatically


## Workflow

Follow the user's lead. If they tell you exactly what to build, build it. The workflow below is the default when they describe a goal and leave the approach to you.

### Step 1: Plan
1. **Read skills first** — Read the matching skill files for API details and patterns.
2. **Discuss the plan** — Start from the **simplest thing that works** — one collection, one screen, one feature. Propose incremental steps that layer on complexity but if the decisions are obvious, you can execute multiple steps in one go. Each step should be a complete horizontal slice (collection + backend logic + UI).
3. **Stop and ask the user to approve.** Iterate until they're happy with the plan. They may reorder steps, drop features, or add ones you didn't think of.

### Step 2: Build (one slice at a time)
4. **Build horizontally** — Pick the first step. Build the full slice: collection schema → `lumera apply` → seed data → UI route/components → commit. Each slice should be deployable and usable on its own.
5. **Stop and ask for feedback** — Tell the user to open the **Preview tab** to see the app. The dev server starts automatically — you do NOT need to run `pnpm dev` or start any server. Iterate on the slice until they're happy.
6. **Repeat** — Move to the next step. Build, deploy, get feedback.

### Rules
7. **Code is source of truth** — Edit files in `platform/`, then deploy with `lumera apply`. Don't edit in the Lumera UI.
8. **Keep docs current** — After each slice, update `architecture.md` with what was built (data models, relationships, hook logic, design decisions). Also update the project description at the top of this file (`AGENTS.md`) so it reflects what the project actually does now — not the original template description.
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
lumera run scripts/seed.py             # Run a script remotely
lumera status                          # Show sync status
```
