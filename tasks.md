# LegalSync Task Backlog

## Immediate
- [x] Add automated coverage for login and signup validation edge cases.
- [x] Replace client-side token storage with the selected secure session strategy.
- [x] Add authorization checks to every protected dashboard and billing endpoint.
- [x] Define and document the OAuth callback routes for Clio, Google, and Outlook.
- [x] Add integration tests for trial creation, conversion, expiry, and cancellation.

## Sync Reliability
- [x] Define canonical internal event and calendar types.
- [x] Make sync writes idempotent using provider event IDs and mapping constraints.
- [x] Add webhook signature verification and replay protection.
- [x] Add retry metrics and a visible failed-sync state.
- [x] Add conflict resolution for last-write-wins, Clio-wins, and calendar-wins policies.
- [x] Add a sync history API and dashboard view backed by persisted records.

## Product Experience
- [x] Connect onboarding buttons to real OAuth flows.
- [x] Add empty, loading, and error states to onboarding and dashboard cards.
- [x] Add calendar selection persistence for multiple calendars.
- [x] Add responsive dashboard navigation.
- [x] Add email verification UI and resend flow.

## Billing
- [x] Finalize Stripe configuration and webhook handling.
- [x] Make crypto charge status updates idempotent.
- [x] Add billing portal and cancellation confirmation states.
- [ ] Add trial-expiry notifications. Needs a scheduled mailer job.

## Quality and Operations
- [x] Resolve existing lint errors incrementally by module.
- [x] Add Playwright coverage for landing, auth, onboarding, and dashboard navigation.
- [x] Add structured server-side logging with sensitive-field redaction.
- [x] Add database migration workflow for production deployments.
- [x] Add health checks for database and provider availability.
- [x] Add a GitHub Actions CI pipeline (lint, unit tests, build, schema, e2e).
- [x] Document staging and production environment setup.

## Definition of Done

A task is complete when the behavior is implemented, relevant tests are added or
updated, the production build passes, and security or migration impact is
documented when applicable.