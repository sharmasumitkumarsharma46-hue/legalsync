'use client';

/**
 * Client-side session helpers.
 *
 * Authentication lives in an httpOnly cookie, so the browser never needs a
 * token in localStorage. Every helper sends cookies with the request and
 * normalises error handling for the dashboard/onboarding screens.
 */

export interface ApiError {
  error: string;
  status: number;
}

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

export async function apiFetch<T>(input: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : {};

  if (!response.ok) {
    const payload = data as Partial<ApiError>;
    throw new ApiRequestError(payload.error || 'Request failed', response.status);
  }

  return data as T;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  firmName: string | null;
  emailVerified: boolean;
}

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    const data = await apiFetch<{ success: boolean; user: CurrentUser }>('/api/auth/me');
    return data.user;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function signOut(): Promise<void> {
  try {
    await apiFetch<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
  } finally {
    localStorage.removeItem('user');
    localStorage.removeItem('selectedPlan');
    localStorage.removeItem('token');
  }
}
