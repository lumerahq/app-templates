# My Lumera App

AI-powered invoice processing with automatic GL coding, vendor management, and approval workflows. Built with [Lumera](https://lumerahq.com).

## Quick Start

```bash
# Apply platform resources (collections + automations)
lumera apply

# Seed sample data
lumera run scripts/seed-demo.py

# Start development
lumera dev
```

## Features

- **Dashboard** — Real-time stats for invoice counts and amounts across all statuses
- **Invoice Management** — Full invoice list with status filters, sorting, and pagination
- **New Invoice** — Manual invoice entry with document upload (drag & drop)
- **AI GL Coding** — One-click AI-powered general ledger code assignment with confidence scores
- **Approval Workflow** — Approve, reject, or post invoices with full status control
- **Audit Trail** — Every action logged for compliance (visible on invoice detail and dedicated audit log page)
- **How it Works** — Interactive guide explaining the processing pipeline
- **Settings** — Manage GL accounts and vendor reference data

## Project Structure

```
├── platform/
│   ├── collections/        # Data schemas (invoices, vendors, gl_accounts, audit_log)
│   └── automations/        # AI coding automation
├── scripts/
│   └── seed-demo.py        # Sample data seeder
└── src/
    ├── components/         # Sidebar, StatCard, layout
    ├── lib/                # Types and query functions
    └── routes/             # Pages (dashboard, invoices, new invoice, audit log, settings, how-it-works)
```

## Development

```bash
pnpm dev          # Start dev server with hot reload
pnpm build        # Build for production
pnpm typecheck    # Run TypeScript type checking
pnpm check        # Run Biome linter + formatter
```
