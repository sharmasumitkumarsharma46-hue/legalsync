import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, unauthorized } from '@/lib/auth/session';
import { PROVIDERS, isProvider, getRedirectUri } from '@/lib/integrations/registry';
import { generateToken } from '@/lib/auth/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  if (!isProvider(provider)) {
    return NextResponse.json({ error: 'Unsupported integration provider' }, { status: 400 });
  }
  const session = getUserFromRequest(request);
  if (!session) return unauthorized();

  const config = PROVIDERS[provider];
  const redirectUri = getRedirectUri(provider);
  const state = generateToken({ userId: session.userId, provider, purpose: 'oauth_state' });
  const authUrl = config.getAuthUrl(redirectUri, state);

  return NextResponse.json({ success: true, provider, authUrl });
}
