# LegalSync Task Backlog

## Immediate
- [ ] Add automated coverage for login and signup validation edge cases.
- [ ] Replace client-side token storage with the selected secure session strategy.
- [ ] Add authorization checks to every protected dashboard and billing endpoint.
- [ ] Define and document the OAuth callback routes for Clio, Google, and Outlook.
- [ ] Add integration tests for trial creation, conversion, expiry, and cancellation.

## Sync Reliability
- [ ] Define canonical internal event and calendar types.
- [ ] Make sync writes idempotent using provider event IDs and mapping constraints.
- [ ] Add webhook signature verification and replay protection.
- [ ] Add retry metrics and a visible failed-sync state.
- [ ] Add conflict resolution tests for last-write-wins, Clio-wins, and calendar-wins policies.
- [ ] Add a sync history API and dashboard view backed by persisted records.

## Product Experience
- [ ] Connect onboarding buttons to real OAuth flows.
- [ ] Add empty, loading, and error states to onboarding and dashboard cards.
- [ ] Add calendar selection persistence for multiple calendars.
- [ ] Add responsive dashboard navigation.
- [ ] Add email verification UI and resend flow.

## Billing
- [ ] Finalize Stripe configuration and webhook handling.
- [ ] Make crypto charge status updates idempotent.
- [ ] Add billing portal and cancellation confirmation states.
- [ ] Add trial-expiry notifications.

## Quality and Operations
- [ ] Resolve existing lint errors incrementally by module.
- [ ] Add Playwright coverage for landing, auth, onboarding, and dashboard navigation.
- [ ] Add structured server-side logging with sensitive-field redaction.
- [ ] Add database migration workflow for production deployments.
- [ ] Add health checks for database and provider availability.
- [ ] Document staging and production environment setup.

## Definition of Done
A task is complete when the behavior is implemented, relevant tests are added or updated, the production build passes, and security or migration impact is documented when applicable.
