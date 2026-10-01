type Level = 'info' | 'warn' | 'error';

const SENSITIVE_KEYS = [
  'password', 'token', 'access_token', 'refresh_token',
  'secret', 'authorization', 'cookie', 'api_key',
];

function redact(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj === null || typeof obj !== 'object') return obj;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    result[k] = SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))
      ? '[REDACTED]'
      : redact(v, depth + 1);
  }
  return result;
}

function log(level: Level, message: string, meta?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta: redact(meta) } : {}),
  };
  const out = JSON.stringify(entry);
  if (level === 'error') {
    console.error(out);
  } else {
    console.log(out);
  }
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
};
