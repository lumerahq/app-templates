# Default App — Technical Reference

## Overview

Blank starter template. One collection, dashboard with placeholders, settings page, AI agent, seed script.

## Collections

### example_items
| Field | Type | Notes |
|-------|------|-------|
| `name` | text | |
| `status` | select | |
| `description` | text | |
| `source_id` | text | External reference ID |

## Agents

| Agent | Directory | Purpose |
|-------|-----------|---------|
| `assistant` | `platform/agents/assistant/` | General-purpose AI agent. Config + system prompt. |

## Frontend Routes

| Route | File | Purpose |
|-------|------|---------|
| `/` | `src/routes/index.tsx` | Dashboard — placeholder stat cards, recent activity |
| `/settings` | `src/routes/settings.tsx` | Settings page placeholder |

## Key Files

```
platform/
├── collections/example_items.json
├── agents/assistant/
│   ├── config.json
│   └── system_prompt.md
src/
├── routes/index.tsx
├── routes/settings.tsx
├── routes/__root.tsx          # Layout — sidebar, auth bridge
├── lib/queries.ts             # Data fetching helpers (pbSql, pbList wrappers)
├── components/StatCard.tsx
├── components/Sidebar.tsx     # APP_NAME constant controls sidebar label
├── main.tsx                   # Auth context, router init
scripts/
└── seed-demo.py               # Idempotent seed script
```

## External IDs

None defined yet. When you add automations or hooks, the CLI derives external IDs as `<package-name>:<resource-name>` from `package.json` name + the automation directory or hook filename.
