# Lumera App Templates — Agent Documentation

This repo contains ready-to-scaffold project templates for the Lumera platform. The Lumera CLI (`lumera init`) fetches templates from this repo at init time, so templates can be updated independently of CLI releases.

## Repo Structure

```
app-templates/
├── CLAUDE.md              # You are here — agent instructions
├── .gitignore             # Repo-wide ignores (node_modules, dist, etc.)
├── registry.json          # Template manifest (source of truth)
├── scripts/
│   ├── create-template.sh    # Scaffold a new template from default
│   ├── sync-skills.sh        # Fetch latest skills from Lumera API
│   └── validate-templates.sh # CI validation for all templates
├── .github/workflows/
│   └── validate.yml       # GitHub Actions CI — runs validation on PRs
├── default/               # "Blank Starter" template
│   ├── template.json      # Template metadata (not copied to user project)
│   └── ...                # Template files
├── invoice-processing/    # "Invoice Processing" template
│   ├── template.json
│   └── ...
└── docs/                  # Design documents and prompts
```

## How the CLI Fetches Templates

1. `lumera init` checks the latest commit SHA via GitHub API
2. If the cached SHA matches, uses local cache at `~/.lumera/templates/`
3. Otherwise, downloads `https://github.com/lumerahq/app-templates/archive/refs/heads/main.tar.gz`
4. Extracts to `~/.lumera/templates/` and stores the commit SHA in `.cache-meta.json`
5. Reads `template.json` from each subdirectory to list available templates
6. Copies the selected template to the user's project directory, replacing default values with the user's project name

## Template File Conventions

### `template.json` (required in every template root)

Metadata file — **not copied** to the user's project. Must contain:

```json
{
  "name": "my-template",
  "title": "My Template Title",
  "description": "One-line description shown in the template picker.",
  "category": "General",
  "version": "1.0.0"
}
```

- `name`: Directory name and CLI identifier (lowercase, hyphens). Used in `lumera init -t <name>`.
- `title`: Human-readable title shown in interactive picker.
- `category`: Grouping label (e.g. "General", "Procure-to-Pay"). Templates in the same category are grouped together.
- `version`: Semver string. Informational only (not enforced by CLI).

### Variable Substitution

Each template is a **runnable Lumera project** that uses its own real name (e.g. `invoice-processing`). During `lumera init`, the CLI reads the template's `package.json` name and title, then replaces them with the user's project name:

| Template Value           | Replaced With            | Description                              |
|--------------------------|--------------------------|------------------------------------------|
| Template's package name  | User's project name      | Lowercase hyphenated (e.g. `cool-app`)   |
| Template's display title | User's project title     | Title-cased (e.g. `Cool App`)            |

For example, `invoice-processing` has `"name": "invoice-processing"` in its `package.json`. When a user runs `lumera init my-app -t invoice-processing`, the CLI replaces `invoice-processing` → `my-app` and `Invoice Processing` → `My App` across all files.

The project initial (first letter shown in sidebar logo) is computed at runtime from a `APP_NAME` constant in `Sidebar.tsx`, so it updates automatically.

**Key rule:** Each template uses its own name in all files. The CLI reads the source name from the template's `package.json` and replaces it with the user's chosen name.

### Auto-derived `external_id`

Automation and hook `external_id` values are **auto-derived by the CLI** from `<app-name>:<resource-name>`. You do not need to specify `external_id` in config files — the CLI computes it from the `package.json` name + the automation directory name or hook filename.

For hook scripts that need to reference other automations by `external_id`, use the `{{app}}` variable. The CLI resolves it at deploy time:

```js
// In a hook script body:
filter: { external_id: '{{app}}:extract_invoice' }
```

### Special Files

| File in template      | Behavior                                                    |
|-----------------------|-------------------------------------------------------------|
| `template.json`       | Metadata only — **not copied** to the user's project        |
| `.gitignore`          | Copied as-is (use the real dotfile name)                    |

### Binary vs Text Files

Currently all files are read as UTF-8 text and processed for variable substitution. Avoid placing binary files (images, fonts, etc.) directly in templates. If a template needs static assets, reference them via URL or add them through a post-scaffold script.

## How to Add a New Template

### Quick Start (recommended)

Use the scaffolding script to create a new template from `default`:

```bash
./scripts/create-template.sh <name> [--title "Title"] [--description "Desc"] [--category "Category"]
```

Example:

```bash
./scripts/create-template.sh expense-tracker \
  --title "Expense Tracker" \
  --description "Track and approve employee expenses." \
  --category "Finance"
```

This will:
1. Copy the `default` template into a new directory
2. Write `template.json` with the provided metadata
3. Update `registry.json` with the new entry
4. Clean up build artifacts (`node_modules`, `dist`, etc.)

The title defaults to a title-cased version of the name and the category defaults to "General" if not provided.

After scaffolding, customize the template:
1. Edit `platform/collections/` to define your collections
2. Edit `src/routes/` to build your pages
3. Edit `scripts/seed-demo.py` to add seed data
4. Update `package.json` name and `lumera.name` to match your template (the CLI replaces them during `lumera init`)

### Manual Steps (if not using the script)

#### Step 1: Create the template directory

```
app-templates/
└── my-new-template/
    ├── template.json          # Required metadata
    ├── .gitignore             # Standard gitignore
    ├── package.json           # Use the template name as the package name
    ├── platform/
    │   └── collections/       # Lumera collection schemas (.json)
    │   └── automations/       # Python automation scripts
    ├── src/                   # Frontend source (React + TanStack Router)
    │   ├── routes/
    │   ├── components/
    │   └── lib/
    └── scripts/
        └── seed-demo.py       # Demo data seeder
```

#### Step 2: Write `template.json`

```json
{
  "name": "my-new-template",
  "title": "My New Template",
  "description": "What this template does in one sentence.",
  "category": "Category Name",
  "version": "1.0.0"
}
```

#### Step 3: Use the template name in all files

In `package.json`:
```json
{
  "name": "my-new-template",
  "version": "0.1.0",
  "lumera": {
    "version": 1,
    "name": "My New Template"
  }
}
```

In automation `config.json` (no `external_id` needed — the CLI derives it automatically):
```json
{
  "name": "My Automation",
  "description": "What this automation does.",
  "inputs": { ... }
}
```

In `Sidebar.tsx` (for the project initial):
```tsx
const APP_NAME = 'My New Template';
// Use {APP_NAME[0]} for initial, {APP_NAME} for full name
```

#### Step 4: Update `registry.json`

Add your template entry to the `templates` array in `registry.json` at the repo root. The fields must match your `template.json`.

### Testing the template

Since templates are runnable projects, you can test directly:

```bash
cd app-templates/my-new-template
pnpm install
lumera login
lumera dev
```

Or scaffold via the CLI to verify substitution works:

```bash
lumera init test-project -t my-new-template -y
cd test-project
pnpm install && pnpm typecheck
```

## Existing Templates

### `default` — Blank Starter
- Minimal dashboard with a single example collection
- Seed script with sample data
- Good starting point for custom apps

### `invoice-processing` — Invoice Processing
- Upload-first invoice creation with AI document extraction (`extract_invoice` automation)
- `after_create` hook triggers extraction automatically on new invoices
- Approval workflow: draft → processing → review → approved/rejected
- Dashboard with stats, invoice list with status filters and pagination
- Detail page with document preview, editable form fields, and approve/reject buttons
- Collections: `ip_invoices`, `ip_vendors`, `ip_gl_accounts`, `ip_line_items`, `ip_comments`, `ip_audit_log`

## Coding Patterns Used in Templates

### Frontend (React + TanStack Router)
- **Data fetching**: `useQuery` from `@tanstack/react-query` with `pbGet`, `pbList`, `pbSql` from `@lumerahq/ui/lib`
- **Mutations**: `useMutation` with `pbCreate`, `pbUpdate` from `@lumerahq/ui/lib`
- **File uploads**: `useFileUpload` hook from `@lumerahq/ui/hooks` + `FileDropzone` component
- **File preview**: `getDownloadUrl(objectKey)` for presigned URLs
- **Automations from frontend**: `createRun({ automationId, inputs })` + `pollRun(runId)` from `@lumerahq/ui/lib`
- **Routing**: File-based routes in `src/routes/`. Layout via `__root.tsx`.
- **Pagination**: Manual `useState(page)` + custom `<table>` + Prev/Next buttons
- **SQL queries**: `pbSql(sql, params)` — note: returns numbers as strings, always cast with `Number()`

### Backend (Python automations)
- **LLM calls**: `llm.complete(prompt, json_mode, temperature)` for text, `llm.extract_text(source, mime_type, filename, prompt)` for document vision
- **Storage**: `storage.download(object_key)` to get file bytes
- **Collections**: `collections.get(name, id)`, `collections.update(name, id, data)`, `collections.list(name, filter, sort, limit)`
- **Inputs**: `inputs["key"]` — dict populated from `createRun({ inputs })` call
- **Return values**: Module-level `return { ... }` — accessible via `run.result` from frontend

## AI Agent Skills

Each template includes Lumera skills in `.claude/skills/` that provide AI agents with detailed API docs and usage patterns. Skills are served from the Lumera platform API and committed to git so agents have them immediately.

### How skills work

- Skill files live at `<template>/.claude/skills/lumera_*.md`
- Each template's `CLAUDE.md` has skill description markers (`<!-- LUMERA_SKILLS_START -->` / `<!-- LUMERA_SKILLS_END -->`)
- The `create-template.sh` script copies skills from `default` when scaffolding a new template
- When a user runs `lumera init`, the CLI re-fetches the latest skills from the API and updates the CLAUDE.md markers

### Keeping skills up to date

Run the sync script to pull the latest skills from the Lumera API into all templates:

```bash
./scripts/sync-skills.sh          # Update all templates
./scripts/sync-skills.sh --dry-run # Preview changes
```

This fetches from `https://app.lumerahq.com/api/public/skills`, updates `.claude/skills/` in each template, and regenerates the CLAUDE.md skill descriptions.

## Collection Naming

Collection names are **global** within a Lumera account — they are not scoped to an app. To avoid collisions when multiple templates are deployed to the same account, prefix generic collection names with a short template identifier:

| Template | Prefix | Example |
|---|---|---|
| invoice-processing | `ip_` | `ip_invoices`, `ip_vendors`, `ip_gl_accounts`, `ip_line_items` |
| payroll-journal-entry | `payroll_` | `payroll_gl_accounts` |
| fixed-asset-tracker | `asset_` | `asset_gl_accounts` |
| collections-agent | `ca_` | `ca_audit_log` |

**Rules:**
- Template-specific collections (e.g. `invoices`, `payroll_runs`, `fixed_assets`) are already unique and don't need a prefix.
- Only prefix generic/shared names that might appear in multiple templates (e.g. `gl_accounts`, `audit_log`).
- The `validate-templates.sh` script checks for cross-template collection name collisions in CI.

## Important Notes

- Templates are fetched as a GitHub tarball — the entire repo is downloaded, not individual templates. Keep the repo size reasonable.
- The CLI caches templates in `~/.lumera/templates/` using commit SHA for invalidation. Changes take effect on the next `lumera init` after a push to `main`.
- Templates are runnable projects — you can `cd` into any template and run `lumera login && lumera dev` to test it directly.
- Always test templates by running them directly and by scaffolding a project with `lumera init` to verify substitution works.
