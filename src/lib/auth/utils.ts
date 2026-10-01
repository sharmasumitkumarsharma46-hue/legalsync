import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface TokenPayload {
  userId: string;
  email?: string;
  provider?: string;
  purpose?: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === 'string') {
      return null;
    }

    const { userId, email, provider, purpose } = decoded as jwt.JwtPayload & Partial<TokenPayload>;
    if (typeof userId !== 'string' || userId.length === 0) {
      return null;
    }

    return {
      userId,
      email: typeof email === 'string' ? email : undefined,
      provider: typeof provider === 'string' ? provider : undefined,
      purpose: typeof purpose === 'string' ? purpose : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Generate a cryptographically secure random token. Used for email
 * verification and password reset links, both of which must be unguessable.
 */
export function generateSecureToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function generateEmailVerificationToken(): string {
  return generateSecureToken(32);
}

export function generatePasswordResetToken(): string {
  return generateSecureToken(32);
}
