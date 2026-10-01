/** @jest-environment node */

import { POST } from '../signup/route';
import { NextRequest } from 'next/server';

// Signup now creates the account inside a transaction, so the mocked pool needs
// `connect` as well. Both share one mock so the SQL-aware stub below covers every
// statement, including BEGIN/COMMIT.
jest.mock('@/lib/db/pool', () => {
  const query = jest.fn(async () => ({ rows: [] }));
  return {
    __esModule: true,
    default: {
      query,
      connect: jest.fn(async () => ({ query, release: jest.fn() })),
    },
  };
});

jest.mock('@/lib/auth/utils', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_password'),
  generateEmailVerificationToken: jest.fn().mockReturnValue('verification_token'),
  generateToken: jest.fn().mockReturnValue('signup_jwt_token'),
}));

import pool from '@/lib/db/pool';
import { resetRateLimits } from '@/lib/auth/rate-limit';

const queryMock = pool.query as jest.Mock;

const CREATED_USER = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  firm_name: 'Test Firm',
  email_verified: false,
};

/**
 * Stub the pool by inspecting SQL text instead of call order, so the test keeps
 * working if the transaction gains or loses statements.
 */
function stubDatabase(options: { existingUser?: boolean } = {}) {
  queryMock.mockImplementation(async (sql: string) => {
    if (/FROM users WHERE email/.test(sql)) {
      return { rows: options.existingUser ? [{ id: 'existing-user' }] : [] };
    }
    if (/INSERT INTO users/.test(sql)) {
      return { rows: [CREATED_USER] };
    }
    return { rows: [] };
  });
}

function findParams(pattern: RegExp): unknown[] | undefined {
  return queryMock.mock.calls.find((call) => pattern.test(String(call[0])))?.[1] as
    | unknown[]
    | undefined;
}

function signupRequest(body: Record<string, unknown>, ip = '198.51.100.5') {
  return new NextRequest('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimits();
    stubDatabase();
  });

  it('should create a new user and set a session cookie', async () => {
    const response = await POST(
      signupRequest({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        firmName: 'Test Firm',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.message).toContain('Account created successfully');

    // The JWT now travels in an httpOnly cookie, never in the response body.
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('ls_session=signup_jwt_token');
    expect(cookie).toContain('HttpOnly');
    expect(data.token).toBeUndefined();

    expect(data.user.email).toBe('test@example.com');
  });


  it('should start a 14-day trial for the selected plan', async () => {
    const response = await POST(
      signupRequest({
        email: 'firm@example.com',
        password: 'password123',
        name: 'Firm User',
        firmName: 'Acme',
        plan: 'small_firm',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.plan).toBe('small_firm');

    const subscriptionParams = findParams(/INSERT INTO subscriptions/);
    expect(subscriptionParams?.[1]).toBe('small_firm');
    expect(subscriptionParams?.[2]).toBeInstanceOf(Date);
  });

  it('should create user settings inside a committed transaction', async () => {
    await POST(
      signupRequest({ email: 'test@example.com', password: 'password123', name: 'Test User' })
    );

    const statements = queryMock.mock.calls.map((call) => String(call[0]));
    expect(statements.some((sql) => /BEGIN/.test(sql))).toBe(true);
    expect(statements.some((sql) => /INSERT INTO user_settings/.test(sql))).toBe(true);
    expect(statements.some((sql) => /COMMIT/.test(sql))).toBe(true);
  });

  it('should return 400 if email is missing', async () => {
    const response = await POST(signupRequest({ password: 'password123', name: 'Test User' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Email');
  });

  it('should return 400 if the email format is invalid', async () => {
    const response = await POST(
      signupRequest({ email: 'not-an-email', password: 'password123', name: 'Test User' })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('valid email');
  });

  it('should return 400 if password is too short', async () => {
    const response = await POST(
      signupRequest({ email: 'test@example.com', password: '123', name: 'Test User' })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('8 characters');
  });

  it('should return 409 if user already exists', async () => {
    stubDatabase({ existingUser: true });

    const response = await POST(
      signupRequest({ email: 'test@example.com', password: 'password123', name: 'Test User' })
    );
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('already exists');
  });

  it('should throttle repeated signups from one client', async () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await POST(
        signupRequest(
          { email: `user${attempt}@example.com`, password: 'password123', name: 'Test User' },
          '203.0.113.10'
        )
      );
    }

    const response = await POST(
      signupRequest(
        { email: 'blocked@example.com', password: 'password123', name: 'Test User' },
        '203.0.113.10'
      )
    );
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Too many');
  });
});
