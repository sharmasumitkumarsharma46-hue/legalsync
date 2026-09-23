# LegalSync Engineering Rules

## General
- Use TypeScript and keep public interfaces explicit.
- Prefer small, focused changes that match existing project patterns.
- Do not commit `.env.local`, credentials, OAuth secrets, payment keys, or user data.
- Use ASCII by default in source and documentation.
- Avoid unrelated refactors in feature changes.

## Security
- Hash passwords with the approved auth utility; never store plaintext passwords.
- Validate and normalize all user input at API boundaries.
- Require authorization before reading or mutating firm data.
- Treat OAuth access and refresh tokens as secrets.
- Verify webhook signatures before changing billing state.
- Do not log passwords, tokens, full webhook payloads, or personal calendar contents.

## Sync Safety
- Every sync operation must be safe to retry.
- Do not silently drop an event when a provider call fails.
- Record provider IDs and mapping IDs for deduplication.
- Preserve the source event version used for conflict detection.
- Use bounded retries with backoff for transient provider failures.
- Surface unresolved conflicts to the user.

## API Rules
- Return consistent JSON error shapes.
- Use appropriate HTTP status codes.
- Keep provider errors internal while returning actionable user-safe messages.
- Make webhook and payment handlers idempotent.

## UI Rules
- Preserve the LegalSync navy, aqua, sky, and paper visual language.
- Keep authentication and onboarding flows clear on mobile and desktop.
- Provide visible loading, error, empty, and success states.
- Support `prefers-reduced-motion` for decorative animations.
- Keep buttons and form controls keyboard accessible with visible focus states.

## Verification
Before merging a change, run the narrowest relevant test first, then:

```bash
npm.cmd run build
npm.cmd test -- --runInBand
```

Run full lint as well. Existing unrelated lint failures must be documented rather than hidden.
