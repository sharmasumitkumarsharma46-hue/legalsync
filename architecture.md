# LegalSync Architecture

## Purpose
LegalSync is a Next.js application that keeps Clio case-management events aligned with Google Calendar and Microsoft Outlook for law firms.

## System Shape

```text
Browser
  |
  v
Next.js App Router
  |-- Pages: landing, auth, onboarding, dashboard
  |-- API routes: auth, billing, trial, crypto webhooks
  |-- Domain libraries: auth, billing, integrations, sync
  |
  v
PostgreSQL
  |-- users and firms
  |-- integrations and OAuth tokens
  |-- calendar mappings
  |-- sync events and conflicts
  |-- subscriptions and trial state

External systems: Clio API, Google Calendar API, Microsoft Graph API, payment providers
```

## Application Layers

### Presentation
`src/app` contains route pages and API route handlers. Client pages own form state and call internal API routes.

### Domain Services
`src/lib/auth`, `src/lib/billing`, and `src/lib/sync` contain business rules that should remain independent from page markup.

### Integration Adapters
`src/lib/integrations` wraps provider-specific authentication and calendar APIs. Provider response shapes should be converted into internal event models at this boundary.

### Persistence
`src/lib/db/pool.ts` owns PostgreSQL access. `src/lib/db/schema.sql` is the source of truth for database tables and indexes.

## Core Request Flows

### Authentication
1. Client submits credentials to `/api/auth/signup` or `/api/auth/login`.
2. API validates input and hashes or verifies the password.
3. API creates or returns a JWT.
4. Client stores the current session and navigates to onboarding or dashboard.

### Calendar Sync
1. A webhook or scheduled/manual action starts a sync.
2. The sync engine loads connected integrations and selected calendar mappings.
3. Provider adapters fetch source events.
4. Events are normalized and matched to existing sync records.
5. New events are created, changed events updated, and conflicts recorded.
6. Retryable failures are retried; permanent failures are logged for review.

### Billing and Trial
1. Signup creates a trial record.
2. Dashboard reads trial status through the trial API.
3. Payment confirmation converts the trial to an active subscription.
4. Webhooks update payment and subscription state idempotently.

## Architectural Rules
- Keep provider-specific code inside integration adapters.
- Keep database queries close to the domain service that owns the behavior.
- API routes validate input, authorize the request, call a service, and serialize a response.
- Sync operations must be idempotent and preserve an audit trail.
- Secrets and OAuth tokens must never be sent to the client or committed to the repository.
