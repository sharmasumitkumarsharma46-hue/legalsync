/** @jest-environment node */

import { POST } from '../login/route';
import { NextRequest } from 'next/server';

// Mock the database pool
jest.mock('@/lib/db/pool', () => ({
  query: jest.fn(),
}));

// Mock the auth utils
jest.mock('@/lib/auth/utils', () => ({
  verifyPassword: jest.fn().mockResolvedValue(true),
  generateToken: jest.fn().mockReturnValue('jwt_token'),
}));

import pool from '@/lib/db/pool';

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should login successfully with valid credentials', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        firm_name: 'Test Firm',
        email_verified: true,
      }],
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
    expect(data.token).toBe('jwt_token');
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
    const { verifyPassword } = require('@/lib/auth/utils');
    verifyPassword.mockResolvedValueOnce(false);

    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User',
        firm_name: 'Test Firm',
        email_verified: true,
      }],
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
});
