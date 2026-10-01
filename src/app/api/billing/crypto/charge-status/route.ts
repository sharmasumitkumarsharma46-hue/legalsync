import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/pool';
import { cryptoPaymentHandler } from '@/lib/billing/crypto';
import { requireSession } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const { session, response } = requireSession(request);
  if (!session) return response;

  const chargeCode = request.nextUrl.searchParams.get('code');
  if (!chargeCode) {
    return NextResponse.json({ error: 'Charge code required' }, { status: 400 });
  }

  const owned = await pool.query(
    `SELECT id FROM subscriptions WHERE user_id = $1 AND crypto_charge_code = $2`,
    [session.userId, chargeCode]
  );
  if (owned.rows.length === 0) {
    return NextResponse.json({ error: 'Charge not found' }, { status: 404 });
  }

  try {
    const charge = await cryptoPaymentHandler.getChargeStatus(chargeCode);
    const status = charge.timeline?.[charge.timeline.length - 1]?.status ?? 'unknown';

    return NextResponse.json({ success: true, charge, status });
  } catch (error) {
    logger.error('Failed to read crypto charge status', {
      chargeCode,
      error: String(error),
    });
    return NextResponse.json({ error: 'Failed to get charge status' }, { status: 502 });
  }
}
