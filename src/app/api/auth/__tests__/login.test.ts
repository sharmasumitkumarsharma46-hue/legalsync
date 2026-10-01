/** @jest-environment node */

import { POST } from '../login/route';
import { NextRequest } from 'next/server';

// Mock the database pool
jest.mock('@/lib/db/pool', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

// Mock the auth utils
jest.mock('@/lib/auth/utils', () => ({
  verifyPassword: jest.fn().mockResolvedValue(true),
  generateToken: jest.fn().mockReturnValue('jwt_token'),
}));

import pool from '@/lib/db/pool';
import { verifyPassword } from '@/lib/auth/utils';
import { resetRateLimits } from '@/lib/auth/rate-limit';

const verifyPasswordMock = verifyPassword as jest.Mock;

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimits();
    verifyPasswordMock.mockResolvedValue(true);
  });

  it('should login successfully and set a session cookie', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 'user-123',
          email: 'test@example.com',
          password_hash: 'hashed_password',
          name: 'Test User',
          firm_name: 'Test Firm',
          email_verified: true,
        },
      ],
    }).mockResolvedValueOnce({}); // Audit log

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);

    // The JWT travels in an httpOnly cookie, never in the response body.
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('ls_session=jwt_token');
    expect(cookie).toContain('HttpOnly');
    expect(data.token).toBeUndefined();

    expect(data.user.email).toBe('test@example.com');
  });

  it('should return 400 if email is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Email');
  });

  it('should return 401 if user not found', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Invalid');
  });

  it('should return 401 if password is incorrect', async () => {
    verifyPasswordMock.mockResolvedValueOnce(false);

    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 'user-123',
          email: 'test@example.com',
          password_hash: 'hashed_password',
          name: 'Test User',
          firm_name: 'Test Firm',
          email_verified: true,
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Invalid');
  });

  it('should throttle repeated failures for the same account', async () => {
    verifyPasswordMock.mockResolvedValue(false);

    for (let attempt = 0; attempt < 9; attempt += 1) {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.77' },
        body: JSON.stringify({ email: 'brute@example.com', password: 'password123' }),
      });

      await POST(request);
    }

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.77' },
      body: JSON.stringify({ email: 'brute@example.com', password: 'password123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Too many');
  });
});
