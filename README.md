# Lumera App Templates

Ready-to-scaffold project templates for the [Lumera](https://lumera.com) platform. Used by `lumera init` to create new projects.

## Available Templates

| Template | Category | Description |
|----------|----------|-------------|
| **Blank Starter** (`default`) | General | A minimal starter with a dashboard, example collection, and seed script. |
| **Invoice Processing** (`invoice-processing`) | Procure-to-Pay | AI-powered invoice processing with automatic GL coding, vendor management, and approval workflows. |

## Usage

```bash
# Install the Lumera CLI
npm install -g @lumerahq/cli

# Create a project (interactive — shows template picker)
lumera init my-app

# Create a project with a specific template
lumera init my-app -t invoice-processing

# Non-interactive mode
lumera init my-app -t invoice-processing -y
```

## Contributing a Template

The fastest way to create a new template is with the scaffolding script:

```bash
./scripts/create-template.sh expense-tracker \
  --title "Expense Tracker" \
  --description "Track and approve employee expenses." \
  --category "Finance"
```

This copies the `default` template, writes `template.json`, and updates `registry.json` for you.

Then customize:
1. Edit `platform/collections/` to define your data model
2. Edit `src/routes/` to build your pages
3. Edit `scripts/seed-demo.py` to add demo data
4. Use `my-lumera-app` / `My Lumera App` as default values — the CLI replaces them with the user's project name
5. Test by running the template directly (`cd my-template && pnpm install && lumera dev`) and by scaffolding with `lumera init`

Each template is a **runnable Lumera project** — you can `cd` into it and run `lumera dev` for development.

See [CLAUDE.md](CLAUDE.md) for detailed conventions and patterns.

## How It Works

The Lumera CLI fetches templates from this repo at `lumera init` time:

1. Checks the latest commit SHA via GitHub API
2. Caches locally in `~/.lumera/templates/` (invalidated when commit SHA changes)
3. Lists templates by scanning for `template.json` files
4. Copies the selected template, replacing `my-lumera-app`/`My Lumera App` with the user's project name

## License

MIT
