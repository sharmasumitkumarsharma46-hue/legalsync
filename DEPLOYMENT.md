# Deploying LegalSync

This guide covers everything that must happen **before** the app is live. No API
credentials are required to read it; each section says where each value comes
from.

---

## 1. Prerequisites

| Need | Why |
| --- | --- |
| A Vercel account | Hosting. Any plan works, see [section 5](#5-cron-schedules) |
| A PostgreSQL database | Managed options: Supabase, Neon, Railway. Local Postgres also works |
| OAuth apps from Clio, Google and Microsoft | Calendar connections |
| A Stripe account | Card payments |
| A Coinbase Commerce account | Optional, only for crypto payments |

---

## 2. Database first

The app cannot answer a single request without its tables, so migrate before the
first deploy.

### 2.1 Create the database

Any PostgreSQL 14+ instance works. On Supabase or Neon, copy the **connection
string** and disable transaction pooling for migrations.

### 2.2 Point the migration at it

```bash
# PowerShell
$env:DATABASE_URL = "postgresql://user:password@host:5432/legalsync"

# macOS / Linux
export DATABASE_URL="postgresql://user:password@host:5432/legalsync"
```

### 2.3 Apply the schema

```bash
npm ci
npm run db:migrate
```

You should see `Migration completed successfully.`

`src/lib/db/schema.sql` is safe to re-run: the migration block at the end uses
`IF NOT EXISTS` and removes duplicates before creating unique indexes. That block
is what keeps the file safe on a database created before the per-calendar mapping
tables existed.

---

## 3. Environment variables

Copy `env.example.txt` to `.env.local` for local work. For Vercel, add the same
keys under **Settings → Environment Variables** and mark every secret as
sensitive.

### Required for the app to run at all

| Variable | Where to get it | If missing |
| --- | --- | --- |
| `DATABASE_URL` | Database provider connection string | Every request returns 500 |
| `JWT_SECRET` | Generate one: `openssl rand -hex 32` | Every page redirects to sign-in forever |
| `APP_URL` | Your domain, no trailing slash | OAuth callbacks and email links break |
| `CRON_SECRET` | Generate one: `openssl rand -hex 32` | Scheduled jobs return 401 |

### Required for calendar connections

| Variable | Where to get it |
| --- | --- |
| `CLIO_CLIENT_ID` / `CLIO_CLIENT_SECRET` | Clio developer account. Redirect URI `/api/integrations/clio/callback` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud console. Redirect URI `/api/integrations/google/callback` |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Azure app registration. Redirect URI `/api/integrations/outlook/callback` |

### Required for webhooks and payments

| Variable | Where to get it |
| --- | --- |
| `CLIO_WEBHOOK_SECRET` | Clio webhook settings. **If unset, Clio webhooks return 503** |
| `GOOGLE_WEBHOOK_SECRET` | Value you send as the push channel token |
| `OUTLOOK_WEBHOOK_SECRET` | Shared secret for Microsoft Graph notifications. Note the `OUTLOOK_` prefix, not `MICROSOFT_`, because that is the provider key |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook endpoint. **If unset, payments return 503** |
| `COINBASE_API_KEY` / `COINBASE_WEBHOOK_SECRET` | Coinbase Commerce, only for crypto |

### Optional

| Variable | Purpose |
| --- | --- |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Verification and password-reset email. Without them LegalSync logs the link and skips sending |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Alternative to `DATABASE_URL`; `src/lib/db/pool.ts` builds the connection string from these |

> Webhook endpoints fail **closed**: if the matching secret is missing they
> return 503 rather than processing unverified payloads. This is intentional.
---

## 4. Deploying

### Vercel (recommended)

```bash
npm i -g vercel
vercel link
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
# repeat for every key in the tables above
vercel --prod
```

Or connect the GitHub repository from the Vercel dashboard.
`.github/workflows/ci.yml` runs on every push and pull request; mark the
`quality` job as a required status check so nothing reaches `main` with a
failing build.

### Any other Node host

```bash
npm ci
npm run build
npm run start
```

`next build` needs no database access, so it is safe to run at image-build time.
The migration must still be applied separately.

---

## 5. Cron schedules

`vercel.json` currently runs both jobs **once a day**, which works on every Vercel
plan:

| Path | Schedule | Does |
| --- | --- | --- |
| `/api/cron/sync` | `0 3 * * *` | Pushes Clio events into every connected calendar |
| `/api/billing/trial/check-expired` | `30 3 * * *` | Expires trials whose period has ended |

**Hobby (free) allows one cron trigger per day.** If you upgrade to Pro and want
the real-time behaviour the dashboard advertises, change the sync schedule to
every five minutes:

```json
{ "path": "/api/cron/sync", "schedule": "*/5 * * * *" }
```

Until then users can still run a sync on demand from the dashboard. Vercel sends
`Authorization: Bearer $CRON_SECRET` automatically as long as `CRON_SECRET` is
set, so no extra configuration is needed.
---

## 6. Post-deploy checklist

Run these against the deployed URL before inviting anyone in.

```bash
# 1. Health. "degraded" with database:"ok" means only the DB is unreachable.
curl -i https://YOUR-DOMAIN/api/health

# 2. Anonymous access must be refused.
curl -i https://YOUR-DOMAIN/dashboard          # expect 307 -> /login
curl -i https://YOUR-DOMAIN/api/auth/me        # expect 401

# 3. Signup creates an account and starts a trial.
curl -i -X POST https://YOUR-DOMAIN/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"password123","name":"You","firmName":"Test"}'

# 4. The session cookie must be set.
curl -i -c cookies.txt -X POST https://YOUR-DOMAIN/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"password123"}'
grep ls_session cookies.txt

# 5. An authenticated read must work with only the cookie.
curl -i -b cookies.txt https://YOUR-DOMAIN/api/billing/trial/status
```

Then sign in through the browser and confirm:

- [ ] Signup creates an account and lands on onboarding
- [ ] The verification email arrives and `/verify-email` reports success
- [ ] Clio connects and returns to onboarding with `?connected=clio`
- [ ] Google or Outlook connects
- [ ] **The calendar picker lists your real calendars and saves the selection**
- [ ] "Sync now" creates at least one real event in that calendar
- [ ] Running "Sync now" twice does **not** duplicate events
- [ ] Sync history shows both runs in the dashboard
- [ ] Editing an event in Clio and in the calendar raises a conflict you can resolve
---

## 7. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Every page redirects to `/login` | `JWT_SECRET` unset or changed | Set it and redeploy; old cookies become invalid |
| `/api/health` returns 503 | Database unreachable | Check `DATABASE_URL`, firewall allow-list, whether SSL is required |
| `relation "users" does not exist` | Migration never ran | `npm run db:migrate` |
| Sync reports "No calendar is selected" | Nothing selected yet | Pick a calendar in the dashboard **Calendars** section |
| OAuth callback returns `?error=...` | Redirect URI mismatch | Re-register the exact URI shown in the provider console |
| A webhook endpoint returns 503 | `*_WEBHOOK_SECRET` missing | Set the secret and re-register the webhook |
| Cron returns 401 | `CRON_SECRET` unset or changed | Set it so Vercel picks up the new value |
| Stripe checkout never confirms | Missing or wrong webhook secret | Copy the signing secret from Stripe, not the API key |

---

## 8. Before real customers

Two things are not covered by CI and must be done by hand:

1. **Run one real sync end to end.** The engine is written against the live Clio
   and Google APIs but has never been exercised against a production account.
   Watch for field-shape mismatches in `src/lib/integrations/*/client.ts`.
2. **Test conflict resolution on purpose.** Create a deadline in Clio, change it
   in both systems between syncs, and confirm the conflict appears and that both
   resolution directions work.