import { Pool } from 'pg';
import { logger } from '@/lib/logger';

/**
 * Resolve a connection string from either the single `DATABASE_URL` variable
 * (preferred, used by managed Postgres providers) or the discrete DB_* values
 * documented in `env.example.txt`.
 */
function resolveConnectionString(): string | undefined {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

  if (!DB_HOST || !DB_NAME || !DB_USER) {
    return undefined;
  }

  const port = DB_PORT || '5432';
  const credentials = DB_PASSWORD
    ? `${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}`
    : encodeURIComponent(DB_USER);

  return `postgresql://${credentials}@${DB_HOST}:${port}/${DB_NAME}`;
}

const connectionString = resolveConnectionString();

if (!connectionString) {
  logger.warn(
    'No database configuration found. Set DATABASE_URL (or DB_HOST, DB_NAME, DB_USER) in .env.local.'
  );
}

const requiresSsl = connectionString
  ? /sslmode=require|supabase\.(co|com)|neon\.tech|render\.com/.test(connectionString)
  : false;

const pool = new Pool({
  connectionString,
  ...(requiresSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on('connect', () => {
  logger.info('Connected to PostgreSQL');
});

pool.on('error', (error) => {
  logger.error('Unexpected PostgreSQL pool error', { error: error.message });
});

export default pool;
