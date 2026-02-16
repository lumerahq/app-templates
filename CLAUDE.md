# Lumera App Templates — Agent Documentation

This repo contains ready-to-scaffold project templates for the Lumera platform. The Lumera CLI (`lumera init`) fetches templates from this repo at init time, so templates can be updated independently of CLI releases.

## Repo Structure

```
app-templates/
├── CLAUDE.md              # You are here — agent instructions
├── README.md              # Human-readable docs
├── registry.json          # Template manifest (source of truth)
├── default/               # "Blank Starter" template
│   ├── template.json      # Template metadata (not copied to user project)
│   └── ...                # Template files
├── invoice-processing/    # "Invoice Processing" template
│   ├── template.json
│   └── ...
└── docs/                  # Design documents and prompts
```

## How the CLI Fetches Templates

1. `lumera init` downloads `https://github.com/lumerahq/app-templates/archive/refs/heads/main.tar.gz`
2. Extracts to `~/.lumera/templates/` (cached for 1 hour)
3. Reads `template.json` from each subdirectory to list available templates
4. Copies the selected template to the user's project directory
5. Falls back to bundled templates (shipped with the CLI npm package) if offline

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

All text files are processed through a simple `{{variable}}` replacement. Available variables:

| Variable             | Example Value       | Description                              |
|----------------------|---------------------|------------------------------------------|
| `{{projectName}}`    | `my-lumera-app`     | Lowercase hyphenated project name        |
| `{{projectTitle}}`   | `My Lumera App`     | Title-cased version of project name      |
| `{{projectInitial}}` | `M`                 | First letter of project title (uppercase) |

Use these in any text file — source code, config, markdown, etc.

### Special File Naming Rules

| File in template      | Output in user project | Why                                         |
|-----------------------|-----------------------|---------------------------------------------|
| `foo.tsx.hbs`         | `foo.tsx`             | `.hbs` suffix is stripped during copy        |
| `gitignore`           | `.gitignore`          | npm strips dotfiles from published packages  |
| `template.json`       | *(not copied)*        | Metadata only — excluded from output         |

### Binary vs Text Files

Currently all files are read as UTF-8 text and processed for variable substitution. Avoid placing binary files (images, fonts, etc.) directly in templates. If a template needs static assets, reference them via URL or add them through a post-scaffold script.

## How to Add a New Template

### Step 1: Create the template directory

```
app-templates/
└── my-new-template/
    ├── template.json          # Required metadata
    ├── gitignore              # Will become .gitignore
    ├── package.json           # Use {{projectName}} for the package name
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

### Step 2: Write `template.json`

```json
{
  "name": "my-new-template",
  "title": "My New Template",
  "description": "What this template does in one sentence.",
  "category": "Category Name",
  "version": "1.0.0"
}
```

### Step 3: Use template variables

In `package.json`:
```json
{
  "name": "{{projectName}}",
  "version": "0.1.0"
}
```

In automation `config.json`:
```json
{
  "external_id": "{{projectName}}:my_automation"
}
```

### Step 4: Update `registry.json`

Add your template entry to the `templates` array in `registry.json` at the repo root. The fields must match your `template.json`.

### Step 5: Test the template

Scaffold from the local directory and verify:

```bash
# From the lumera repo, point CLI at this repo's template
cp -R app-templates/my-new-template /tmp/test-scaffold
cd /tmp/test-scaffold
# Manually replace {{projectName}} etc., then:
pnpm install && pnpm typecheck
```

Or test via the CLI with a local override (see CLI docs).

## Existing Templates

### `default` — Blank Starter
- Minimal dashboard with a single example collection
- Seed script with sample data
- Good starting point for custom apps

### `invoice-processing` — Invoice Processing & GL Coding
- Upload-first invoice creation with AI document extraction (`extract_invoice` automation)
- AI-powered GL code classification (`classify_and_code` automation)
- Vendor management, approval workflows, audit trail
- Dashboard with stats, invoice list with pagination, detail view with document preview
- Collections: `invoices`, `vendors`, `gl_accounts`, `audit_log`

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

## Important Notes

- Templates are fetched as a GitHub tarball — the entire repo is downloaded, not individual templates. Keep the repo size reasonable.
- The CLI caches templates in `~/.lumera/templates/` for 1 hour. Changes to this repo take effect on the next cache refresh.
- The bundled templates in the CLI npm package serve as offline fallback. They should be kept in sync with this repo at major versions.
- Always test templates by scaffolding a project and running `pnpm install && pnpm typecheck` before merging.
