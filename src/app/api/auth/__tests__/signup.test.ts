/** @jest-environment node */

import { POST } from '../signup/route';
import { NextRequest } from 'next/server';

// Mock the database pool
jest.mock('@/lib/db/pool', () => ({
  query: jest.fn(),
}));

// Mock the auth utils
jest.mock('@/lib/auth/utils', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_password'),
  generateEmailVerificationToken: jest.fn().mockReturnValue('verification_token'),
  generateToken: jest.fn().mockReturnValue('signup_jwt_token'),
}));

import pool from '@/lib/db/pool';

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new user successfully', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] }) // User doesn't exist
      .mockResolvedValueOnce({ rows: [{ id: 'user-123', email: 'test@example.com', name: 'Test User', firm_name: 'Test Firm', email_verified: false }] }) // User created
      .mockResolvedValueOnce({}) // Settings created
      .mockResolvedValueOnce({}); // Subscription created

    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        firmName: 'Test Firm',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.message).toContain('Account created successfully');
    expect(data.token).toBe('signup_jwt_token');
    expect(data.user.email).toBe('test@example.com');
  });

  it('should save the selected plan during signup', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'user-456', email: 'firm@example.com', name: 'Firm User', firm_name: 'Acme', email_verified: false }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'firm@example.com',
        password: 'password123',
        name: 'Firm User',
        firmName: 'Acme',
        plan: 'small_firm',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.plan).toBe('small_firm');
  });

  it('should return 400 if email is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        password: 'password123',
        name: 'Test User',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Email');
  });

  it('should return 400 if password is too short', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: '123',
        name: 'Test User',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('8 characters');
  });

  it('should return 409 if user already exists', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ id: 'existing-user' }],
    });

    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('already exists');
  });
});
