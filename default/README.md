# Default App

Lumera custom embedded app.

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Login to Lumera:
   ```bash
   lumera login
   ```

3. Start development server:
   ```bash
   pnpm dev
   ```

## CLI Commands

```bash
# Development
lumera dev                        # Start dev server
lumera dev --port 3000            # Custom port

# Deployment
lumera apply app                  # Build and deploy frontend
lumera apply                      # Apply all resources
lumera plan                       # Preview changes

# Scripts
lumera run scripts/seed-demo.py   # Run seed script

# Project info
lumera status                     # Show project info
```

## Project Structure

```
├── src/                # Frontend (React + TanStack)
│   ├── routes/         # TanStack Router pages
│   ├── components/     # React components
│   └── lib/            # API utilities
├── platform/           # Backend resources
│   ├── collections/    # Collection schemas (JSON)
│   ├── automations/    # Automation scripts (Python)
│   └── hooks/          # Server-side hooks (JS)
├── scripts/            # Local scripts
└── CLAUDE.md           # AI assistant instructions
```

## Documentation

- `CLAUDE.md` - AI coding assistant instructions
- `ARCHITECTURE.md` - System architecture (customize for your app)
