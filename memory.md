# LegalSync Project Memory

## Product
- LegalSync syncs Clio case-management calendars with Google Calendar and Microsoft Outlook.
- The primary users are solo attorneys, small-firm managers, and administrative staff.
- The core product promise is fewer missed deadlines through reliable calendar alignment.
- Pricing and trial behavior are documented in `PRD.md`.

## Current Stack
- Next.js App Router with React and TypeScript.
- Tailwind CSS v4 through PostCSS.
- PostgreSQL accessed through `pg`.
- JWT-based authentication utilities.
- Provider clients under `src/lib/integrations`.
- Sync and retry logic under `src/lib/sync`.

## Important Paths
- Pages and API routes: `src/app`.
- Authentication helpers: `src/lib/auth`.
- Billing and trials: `src/lib/billing`.
- Database pool and schema: `src/lib/db`.
- Provider clients: `src/lib/integrations`.
- Sync engine and conflict handling: `src/lib/sync`.
- Shared visual styles: `src/app/globals.css`.

## Commands
```bash
npm.cmd run dev
npm.cmd run build
npm.cmd test -- --runInBand
npm.cmd run lint
```

## Known Context
- The development server uses port 3000 by default.
- Windows PowerShell may block `npm.ps1`; use `npm.cmd` when needed.
- The production build currently succeeds.
- Full lint currently reports pre-existing issues across tests, dashboard, auth utilities, billing, integrations, and sync modules.
- Login and signup use the shared auth visual direction and animated calendar treatment in `globals.css`.

## Decisions To Preserve
- Keep sync behavior idempotent and auditable.
- Keep provider-specific behavior behind adapters.
- Treat legal deadlines and OAuth credentials as high-sensitivity data.
- Prefer focused, testable domain services over logic embedded in page components.
