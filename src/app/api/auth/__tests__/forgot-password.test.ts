/** @jest-environment node */

import { NextRequest } from 'next/server';
import { POST as forgotPassword } from '../forgot-password/route';
import { POST as resetPassword } from '../reset-password/route';

jest.mock('@/lib/db/pool', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/utils', () => ({
  hashPassword: jest.fn().mockResolvedValue('new_hash'),
  generatePasswordResetToken: jest.fn().mockReturnValue('reset_token_123'),
}));

import pool from '@/lib/db/pool';

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate a reset token for an existing user', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 'user-123', email: 'test@example.com' }] })
      .mockResolvedValueOnce({ rows: [] });

    const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await forgotPassword(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain('reset link');
    expect(pool.query).toHaveBeenCalledTimes(2);
  });
});

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reset a password when the token is valid', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [{ id: 'user-123', password_reset_expires_at: new Date(Date.now() + 60 * 60 * 1000) }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'reset_token_123',
        password: 'newpassword123',
      }),
    });

    const response = await resetPassword(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain('updated');
    expect(pool.query).toHaveBeenCalledTimes(2);
  });
});
