/**
 * Edge-safe session token verification.
 *
 * `jsonwebtoken` relies on Node crypto and cannot run inside the Next.js
 * Proxy/Edge runtime, so HS256 verification is re-implemented with the Web
 * Crypto API. Only signature and expiry are checked here; full payload
 * validation still happens in the Node.js route handlers.
 */

const textEncoder = new TextEncoder();

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodePayload(segment: string): Record<string, unknown> | null {
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(segment));
    const parsed = JSON.parse(json) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export interface EdgeSessionPayload {
  userId: string;
  email?: string;
}

export async function verifySessionTokenEdge(
  token: string,
  secret: string
): Promise<EdgeSessionPayload | null> {
  if (!token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [headerSegment, payloadSegment, signatureSegment] = parts;

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      textEncoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureValid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(signatureSegment),
      textEncoder.encode(`${headerSegment}.${payloadSegment}`)
    );

    if (!signatureValid) {
      return null;
    }
  } catch {
    return null;
  }

  const payload = decodePayload(payloadSegment);
  if (!payload) {
    return null;
  }

  const { userId, email, exp } = payload as { userId?: unknown; email?: unknown; exp?: unknown };

  if (typeof userId !== 'string' || userId.length === 0) {
    return null;
  }

  if (typeof exp === 'number' && exp * 1000 <= Date.now()) {
    return null;
  }

  return { userId, email: typeof email === 'string' ? email : undefined };
}
