# LegalSync

LegalSync is a legal operations platform built to keep firm deadlines, calendars, and case activity aligned across Clio, Google Calendar, and Outlook.

## Overview

The product helps law firms reduce missed deadlines, improve internal coordination, and keep every calendar in sync without forcing teams to work across disconnected tools.

Core capabilities include:
- user onboarding and account setup
- secure authentication and password reset flow
- trial-based subscription flow and pricing selection
- campaign-style marketing landing page
- calendar-sync architecture for Clio, Google Calendar, and Outlook
- audit logging and subscription status handling

## Tech Stack

- Next.js 16 (App Router + `proxy.ts` for request guards)
- React 19
- TypeScript
- Tailwind CSS
- PostgreSQL
- JWT authentication in an httpOnly session cookie
- Nodemailer for email
- Google Calendar API / Microsoft Graph / Clio integration adapters

## Features

### Product experience
- landing page with SaaS-style pricing section
- signup, login, password reset, and email verification flow (including resend)
- onboarding wizard with real OAuth connection and real calendar selection
- dashboard with sync health, connections, calendar selection, sync history,
  conflict resolution, billing and settings
- help centre, privacy, cookie, refund, data collection and third-party embed pages

### Sync platform
- Clio-to-calendar sync engine for Google Calendar and Outlook
- calendar-to-Clio reverse sync
- per-calendar event mapping so repeated runs update instead of duplicating
- automatic OAuth token refresh with a 5-minute buffer
- webhook-driven incremental sync with signature verification, replay
  protection and duplicate-delivery handling
- bounded retries with exponential backoff
- content-comparison conflict detection with last-write-wins, Clio-wins and
  calendar-wins resolution
- sync history persisted per run

### Billing and auth
- trial status and expiry endpoints (GET + POST for cron compatibility)
- Stripe Checkout and Coinbase Commerce payments with idempotent webhooks
- invoices, plan changes and cancellation at period end
- secure password hashing, rate-limited auth endpoints and cryptographically
  random verification/reset tokens

## Local setup

### Prerequisites
- Node.js 18+
- PostgreSQL
- npm

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
copy env.example.txt .env.local
```

`env.example.txt` documents every variable the app reads, including
`DATABASE_URL` (or the discrete `DB_*` values), the OAuth client secrets, the
per-provider webhook secrets, `STRIPE_WEBHOOK_SECRET`, `COINBASE_WEBHOOK_SECRET`
and `CRON_SECRET`.

### 3. Run the database schema

```bash
npm run db:migrate
```

`src/lib/db/schema.sql` is idempotent for existing databases, so re-running it
is safe after pulling changes. The script shells out to `tsx` through `npx`.

### 4. Run the app

```bash
npm run dev
```

Open http://localhost:3000

## Scripts

```bash
npm run dev          # start the development server
npm run build        # production build
npm run start        # serve the production build
npm run lint         # eslint
npm test             # jest unit tests
npm run test:watch   # jest in watch mode
npm run test:coverage
npm run test:e2e     # playwright end-to-end tests
npm run db:migrate   # apply src/lib/db/schema.sql
npm run verify       # lint + unit tests + production build in one go
```

## Deploying

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the full guide: database setup,
every environment variable and where to get it, Vercel and non-Vercel deploys,
cron plan limits, a post-deploy verification checklist and troubleshooting.

The short version:

1. Create a PostgreSQL database and run `npm run db:migrate` against it
2. Set `DATABASE_URL`, `JWT_SECRET`, `APP_URL` and `CRON_SECRET` in your host
3. Add the OAuth, webhook and payment secrets when you need those features
4. Deploy, then walk the post-deploy checklist before inviting anyone

Every webhook endpoint fails closed: a missing secret returns 503 instead of
processing unverified payloads.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request to `main` and
has three independent jobs:

| Job | What it does |
| --- | --- |
| `quality` | `npm run lint`, unit tests, and a full production build |
| `schema` | Spins up PostgreSQL 16 and runs `npm run db:migrate` twice, so a broken or non-idempotent schema fails the build |
| `e2e` | Installs Playwright chromium and runs the end-to-end suite, uploading the HTML report when it fails |

Make `quality` a required status check in the repository settings so nothing
reaches `main` with a failing build.

## Project structure

```text
legalsync/
├── .github/workflows/ci.yml
├── e2e/
├── public/
├── src/
│   ├── proxy.ts          # Next 16 request guards (session cookie)
│   ├── app/
│   │   ├── api/          # auth, billing, cron, health, integrations, settings, sync
│   │   ├── components/
│   │   └── ...           # landing, auth, onboarding, dashboard, legal pages
│   ├── components/
│   ├── lib/
│   │   ├── auth/         # session, token utils, edge verify, rate limiting
│   │   ├── billing/      # plans, stripe, crypto, trials
│   │   ├── db/           # pool, schema.sql, migrate
│   │   ├── integrations/ # clio, google, outlook clients + registry
│   │   └── sync/         # engine, conflict, retry
│   └── types/
├── env.example.txt
├── vercel.json
└── package.json
```

## Environment file

Copy `env.example.txt` to `.env.local`. It documents every variable the app
reads, including `DATABASE_URL` (or the discrete `DB_*` values), the OAuth
client secrets, the per-provider `*_WEBHOOK_SECRET` values,
`STRIPE_WEBHOOK_SECRET`, `COINBASE_WEBHOOK_SECRET` and `CRON_SECRET`.

## Testing

```bash
node .\node_modules\jest\bin\jest.js --runInBand
```

## Production check

```bash
node .\node_modules\next\dist\bin\next build
```

## Notes

This repository is set up as a working product prototype and engineering foundation. Some external services such as Google OAuth, Microsoft OAuth, Clio, SMTP, and billing require real credentials to be enabled in production.

## License

This project is currently intended for internal prototype and product development use.
