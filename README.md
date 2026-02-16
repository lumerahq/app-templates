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

1. Create a new directory at the repo root with your template name (lowercase, hyphens)
2. Add a `template.json` with metadata (`name`, `title`, `description`, `category`, `version`)
3. Use `my-lumera-app` and `My Lumera App` as default values — the CLI replaces them with the user's project name
4. Add your template to `registry.json`
5. Test by running the template directly (`cd my-template && pnpm install && lumera login`) and by scaffolding with `lumera init`

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
