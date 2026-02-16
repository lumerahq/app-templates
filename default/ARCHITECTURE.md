# {{projectTitle}} — Architecture

## Overview

{{projectTitle}} is a Lumera embedded app — a React frontend served inside the Lumera platform iframe, backed by collections, hooks, and automations managed through the Lumera CLI.

## System Diagram

```
┌─────────────────────────────────────────────────┐
│  Lumera Platform                                │
│                                                 │
│  ┌───────────┐   postMessage    ┌────────────┐  │
│  │  Host UI  │ ◄──────────────► │  App       │  │
│  │           │   (auth, init)   │  (iframe)  │  │
│  └─────┬─────┘                  └─────┬──────┘  │
│        │                              │         │
│        │  REST API                    │         │
│        ▼                              ▼         │
│  ┌──────────────────────────────────────────┐   │
│  │  Lumera API                              │   │
│  │  - Collections (CRUD, SQL, search)       │   │
│  │  - Automations (run, poll, cancel)       │   │
│  │  - File storage (upload, download)       │   │
│  └──────────────┬───────────────────────────┘   │
│                 │                                │
│                 ▼                                │
│  ┌──────────────────────────────────────────┐   │
│  │  Tenant Database (PocketBase/SQLite)     │   │
│  │  - example_items                         │   │
│  │  - (add your collections here)           │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Frontend (`src/`)

React app using TanStack Router (file-based routing) and TanStack Query for data fetching. Embedded in Lumera via iframe with postMessage bridge for authentication.

| Directory        | Purpose                              |
|------------------|--------------------------------------|
| `src/routes/`    | Pages — file names map to URL paths  |
| `src/components/`| Shared React components              |
| `src/lib/`       | API helpers, query functions         |
| `src/main.tsx`   | App entry — auth bridge, router init |

**Key patterns:**
- Auth context flows from `main.tsx` via `AuthContext`
- Data fetching uses `pbList`, `pbSql` from `@lumerahq/ui/lib`
- Styling via Tailwind CSS 4 with theme tokens in `styles.css`

## Platform Resources (`platform/`)

Declarative definitions deployed via `lumera apply`.

| Directory                | Purpose                          |
|--------------------------|----------------------------------|
| `platform/collections/`  | Collection schemas (JSON)        |
| `platform/automations/`  | Background Python scripts        |
| `platform/hooks/`        | Server-side JS on collection events |

## Scripts (`scripts/`)

Local Python scripts run via `lumera run`. Used for seeding data, migrations, and ad-hoc operations. All scripts should be idempotent.

## Data Flow

1. **User opens app** → Lumera host sends auth payload via postMessage
2. **App authenticates** → Stores session token in `AuthContext`
3. **App fetches data** → Calls Lumera API via `@lumerahq/ui/lib` helpers
4. **Data mutations** → API calls trigger collection hooks if configured
5. **Background work** → Automations run async via `createRun` / `pollRun`

## Collections

| Collection       | Purpose                    |
|------------------|----------------------------|
| `example_items`  | Starter collection (replace with your own) |

_Update this table as you add collections._
