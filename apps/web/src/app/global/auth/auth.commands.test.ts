import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/apiError';
import { authStore } from '@/app/global/auth/auth.store';
import type { AuthSession } from '@/models/auth';
import { authService } from '@/services/auth.service';
import { authCommands } from './auth.commands';

vi.mock('@/app/global/activeOrg/activeOrg.commands', () => ({
  activeOrgCommands: {
    initialize: vi.fn(),
    clearOrg: vi.fn(),
  },
}));

vi.mock('@/app/global/activeStore/activeStore.commands', () => ({
  activeStoreCommands: {
    initialize: vi.fn(),
    clearStore: vi.fn(),
  },
}));

vi.mock('@/services/auth.service', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));

const session: AuthSession = {
  accessToken: 'access-token',
  user: {
    email: 'user@example.com',
    id: 'user-1',
    isSuperAdmin: false,
    username: 'ordering-user',
    memberships: [],
  },
};

describe('authCommands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStore.setState({
      accessToken: null,
      status: 'anonymous',
      user: null,
    });
  });

  it('stores the session after login succeeds', async () => {
    vi.mocked(authService.login).mockResolvedValue(session);

    await expect(
      authCommands.login({
        email: 'user@example.com',
        password: 'Password123',
      }),
    ).resolves.toEqual({
      status: 'authenticated',
      user: session.user,
    });

    expect(authStore.getState()).toMatchObject({
      accessToken: 'access-token',
      status: 'authenticated',
      user: session.user,
    });
  });

  it('validates login input before calling the service', async () => {
    await expect(
      authCommands.login({
        email: 'invalid-email',
        password: '',
      }),
    ).resolves.toEqual({
      fieldErrors: {
        email: 'Enter a valid email.',
        password: 'Password is required.',
      },
      message: 'Check the highlighted fields and try again.',
      status: 'failed',
    });

    expect(authService.login).not.toHaveBeenCalled();
    expect(authStore.getState()).toMatchObject({
      accessToken: null,
      status: 'anonymous',
      user: null,
    });
  });

  it('deduplicates concurrent initialization refresh requests', async () => {
    vi.mocked(authService.refresh).mockResolvedValue(session);

    await Promise.all([authCommands.initialize(), authCommands.initialize()]);

    expect(authService.refresh).toHaveBeenCalledOnce();
    expect(authStore.getState()).toMatchObject({
      accessToken: 'access-token',
      status: 'authenticated',
      user: session.user,
    });
  });

  it('clears the session after logout succeeds', async () => {
    authStore.setState({
      accessToken: 'access-token',
      status: 'authenticated',
      user: session.user,
    });
    vi.mocked(authService.logout).mockResolvedValue({
      ok: true,
    });

    await expect(authCommands.logout()).resolves.toEqual({
      status: 'logged-out',
    });

    expect(authStore.getState()).toMatchObject({
      accessToken: null,
      status: 'anonymous',
      user: null,
    });
  });

  it('keeps the session when logout fails', async () => {
    authStore.setState({
      accessToken: 'access-token',
      status: 'authenticated',
      user: session.user,
    });
    vi.mocked(authService.logout).mockRejectedValue(
      new ApiError({
        code: 'NETWORK_ERROR',
        message: 'Unable to reach the API.',
        statusCode: 0,
      }),
    );

    await expect(authCommands.logout()).resolves.toEqual({
      reason: 'network',
      status: 'failed',
    });

    expect(authStore.getState()).toMatchObject({
      accessToken: 'access-token',
      status: 'authenticated',
      user: session.user,
    });
  });
});
