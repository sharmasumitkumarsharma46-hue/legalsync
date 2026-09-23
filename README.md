# LegalSync

A calendar synchronization layer for law firms, enabling bidirectional sync between case management systems (Clio) and personal calendars (Google Calendar, Outlook).

## Overview

LegalSync helps law firms prevent missed deadlines and malpractice risks by automatically synchronizing calendar events across their existing systems. The platform provides:

- **Bidirectional Sync**: Automatic two-way sync between Clio and personal calendars
- **Conflict Resolution**: Automatic detection and resolution of conflicting event modifications
- **Real-time Updates**: Webhook support for immediate sync triggers
- **Enterprise Security**: SOC 2 ready, HIPAA compliant
- **Easy Setup**: <10 minute onboarding with guided wizard

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Next.js API Routes
- **Database**: PostgreSQL
- **Authentication**: JWT, OAuth (Google, Microsoft)
- **Integrations**: Clio API, Google Calendar API, Microsoft Graph API

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm, yarn, or pnpm

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd legalsync
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the environment variables template:

```bash
cp env.example.txt .env.local
```

Edit `.env.local` and fill in the following variables:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=legalsync
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT Secret
JWT_SECRET=your_jwt_secret_here_change_in_production

# Clio OAuth
CLIO_CLIENT_ID=your_clio_client_id
CLIO_CLIENT_SECRET=your_clio_client_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret

# Stripe (for billing)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### 4. Set Up Database

Create a PostgreSQL database:

```bash
createdb legalsync
```

Run the database schema:

```bash
psql legalsync < src/lib/db/schema.sql
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
legalsync/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── api/          # API routes
│   │   ├── dashboard/    # Dashboard page
│   │   ├── onboarding/   # Onboarding wizard
│   │   └── page.tsx      # Landing page
│   ├── lib/
│   │   ├── auth/         # Authentication utilities
│   │   ├── db/           # Database connection and schema
│   │   ├── integrations/ # Third-party API clients
│   │   └── sync/         # Sync engine and conflict resolution
│   └── components/       # React components
├── public/               # Static assets
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/verify` - Verify email address

### Integrations
- `POST /api/integrations/clio/connect` - Connect Clio account
- `POST /api/integrations/google/connect` - Connect Google Calendar
- `POST /api/integrations/outlook/connect` - Connect Outlook

### Sync
- `POST /api/sync/trigger` - Trigger manual sync
- `GET /api/sync/history` - Get sync history

### Billing
- `POST /api/billing/subscribe` - Subscribe to a plan
- `POST /api/billing/cancel` - Cancel subscription

## Development

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

### Starting Production Server

```bash
npm start
```

## OAuth Setup

### Clio OAuth
1. Go to [Clio Developer Portal](https://app.goclio.com/oauth2/applications)
2. Create a new OAuth application
3. Set redirect URI to `http://localhost:3000/api/integrations/clio/callback`
4. Copy client ID and secret to `.env.local`

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new OAuth 2.0 client ID
3. Add redirect URI: `http://localhost:3000/api/integrations/google/callback`
4. Copy client ID and secret to `.env.local`

### Microsoft OAuth
1. Go to [Azure Portal](https://portal.azure.com)
2. Register a new application
3. Add redirect URI: `http://localhost:3000/api/integrations/microsoft/callback`
4. Copy client ID and secret to `.env.local`

## Security

- All sensitive data encrypted at rest (AES-256)
- All data encrypted in transit (TLS 1.3)
- OAuth tokens encrypted in database
- Rate limiting implemented
- Audit logging for all significant actions

## License

Proprietary - All rights reserved

## Support

For support, email support@legalsync.com
