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

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- PostgreSQL
- JWT authentication
- Nodemailer for email
- Google Calendar API / Microsoft Graph / Clio integration hooks

## Features

### Product experience
- landing page with SaaS-style pricing section
- signup, login, password reset, and email verification flow
- onboarding wizard for first-time user setup
- dashboard with subscription/trial visibility

### Sync platform
- Clio-to-calendar sync engine
- Google Calendar client and Outlook client
- event mapping and sync history logic
- retry and conflict handling scaffolding

### Billing and auth
- trial status endpoints
- subscription conversion logic
- secure password hashing and token generation

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

Then update the values in `.env.local` with your database, JWT secret, SMTP, and OAuth credentials.

### 3. Run the app

```bash
npm run dev
```

Open http://localhost:3000

## Scripts

```bash
npm run dev
npm run build
npm run start
npm test
npm run test:e2e
```

## Project structure

```text
legalsync/
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── dashboard/
│   │   ├── forgot-password/
│   │   ├── login/
│   │   ├── onboarding/
│   │   ├── reset-password/
│   │   ├── signup/
│   │   └── page.tsx
│   ├── components/
│   ├── lib/
│   │   ├── auth/
│   │   ├── billing/
│   │   ├── db/
│   │   ├── integrations/
│   │   └── sync/
│   └── types/
├── e2e/
├── public/
├── env.example.txt
├── package.json
├── next.config.ts
├── jest.config.js
├── playwright.config.ts
├── README.md
└── tsconfig.json
```

## Environment file

The project includes an example environment template in [env.example.txt](env.example.txt). Fill in real values before running the app in a real environment.

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
