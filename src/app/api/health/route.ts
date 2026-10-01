import { NextResponse } from 'next/server';
import pool from '@/lib/db/pool';

export async function GET() {
  const checks: Record<string, string> = {};

  try {
    await pool.query('SELECT 1');
    checks['database'] = 'ok';
  } catch {
    checks['database'] = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  );
}
