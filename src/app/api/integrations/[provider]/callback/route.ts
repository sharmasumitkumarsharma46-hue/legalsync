import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { verifyToken } from '@/lib/auth/utils';
import { PROVIDERS, isProvider, getRedirectUri } from '@/lib/integrations/registry';

function appUrl(): string {
  return process.env.APP_URL || 'http://localhost:3000';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const baseUrl = appUrl();

  if (!isProvider(provider)) {
    return NextResponse.redirect(`${baseUrl}/onboarding?error=unsupported`);
  }

  const providerError = request.nextUrl.searchParams.get('error');
  if (providerError) {
    return NextResponse.redirect(`${baseUrl}/onboarding?error=${encodeURIComponent(provider)}`);
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/onboarding?error=${encodeURIComponent(provider)}`);
  }

  const decoded = verifyToken(state);
  if (!decoded || decoded.purpose !== 'oauth_state' || decoded.provider !== provider || !decoded.userId) {
    return NextResponse.redirect(`${baseUrl}/onboarding?error=invalid_state`);
  }

  try {
    const config = PROVIDERS[provider];
    const redirectUri = getRedirectUri(provider);
    const tokens = await config.exchangeCode(code, redirectUri);

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    await pool.query(
      `INSERT INTO integrations (user_id, integration_type, access_token, refresh_token, token_expires_at, status)
       VALUES ($1, $2, $3, $4, $5, 'connected')
       ON CONFLICT (user_id, integration_type)
       DO UPDATE SET
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expires_at = EXCLUDED.token_expires_at,
         status = 'connected',
         updated_at = NOW()`,
      [decoded.userId, config.integrationType, tokens.access_token, tokens.refresh_token || null, expiresAt]
    );

    return NextResponse.redirect(`${baseUrl}/onboarding?connected=${encodeURIComponent(provider)}`);
  } catch (error) {
    console.error(`Error completing ${provider} OAuth callback:`, error);
    return NextResponse.redirect(`${baseUrl}/onboarding?error=${encodeURIComponent(provider)}`);
  }
}
