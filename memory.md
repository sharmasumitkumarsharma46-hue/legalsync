






















# LegalSync Project Memory

## Product
- LegalSync syncs Clio case-management calendars with Google Calendar and Microsoft Outlook.
- The primary users are solo attorneys, small-firm managers, and administrative staff.
- The core product promise is fewer missed deadlines through reliable calendar alignment.
- Pricing and trial behavior are documented in `PRD.md`.

## Current Stack
- Next.js App Router with React and TypeScript.
- Tailwind CSS v4 through PostCSS.
- PostgreSQL accessed through `pg` (`DATABASE_URL` or the `DB_*` values).
- JWT-based authentication stored in an httpOnly session cookie.
- Provider clients under `src/lib/integrations`.
- Sync and retry logic under `src/lib/sync`.

## Important Paths
- Pages and API routes: `src/app`.
- Request guards: `src/proxy.ts` (Next 16 renamed `middleware` to `proxy`).
- Authentication helpers: `src/lib/auth` (`session`, `utils`, `edge`, `rate-limit`).
- Client-side session helpers: `src/lib/auth/client.ts`.
- Billing and trials: `src/lib/billing`.
- Database pool, schema and migrations: `src/lib/db`.
- Provider clients and registry: `src/lib/integrations`.
- Sync engine, conflict detection and retry: `src/lib/sync`.
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
- The production build succeeds and lint reports zero problems.
- `.github/workflows/ci.yml` runs three jobs on every push and pull request:
  `quality` (lint + unit tests + build), `schema` (migrations applied twice
  against PostgreSQL 16 to prove the schema is valid and idempotent), and `e2e`
  (Playwright chromium).
- `src/proxy.ts` verifies the session cookie with Web Crypto because
  `jsonwebtoken` cannot run in the Edge runtime.
- Playwright covers public pages and the anonymous redirect behaviour. Run it
  with `npm.cmd run test:e2e`; it starts the dev server itself.
- `npm run build` prints a database warning when no database variables are set,
  which is expected in an unconfigured local environment.

## Decisions To Preserve
- Keep sync behavior idempotent and auditable.
- Keep provider-specific behavior behind adapters.
- Treat legal deadlines and OAuth credentials as high-sensitivity data.
- Prefer focused, testable domain services over logic embedded in page components.
- Never store the session token in `localStorage`; the cookie is the session.
