import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/apiError';
import { activeOrgCommands } from '@/app/global/activeOrg/activeOrg.commands';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { authStore } from '@/app/global/auth/auth.store';
import type { AuthSession, AuthUserDto } from '@/models/auth';
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
    me: vi.fn(),
  },
}));

vi.mock('@/app/global/feedback/feedback.commands', () => ({
  feedbackCommands: {
    toast: vi.fn(),
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
      message: 'Invalid input. Check your details and try again.',
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

  it('reconciles the active org when refreshSession succeeds', async () => {
    const refreshed: AuthSession = {
      accessToken: 'access-token',
      user: {
        ...session.user,
        memberships: [
          {
            organizationId: 'org-1',
            organizationName: 'Org',
            role: 'org_admin',
          },
        ],
      },
    };
    vi.mocked(authService.refresh).mockResolvedValue(refreshed);

    await expect(authCommands.refreshSession()).resolves.toBe(true);

    expect(activeOrgCommands.initialize).toHaveBeenCalledWith(
      refreshed.user.memberships,
    );
    expect(authStore.getState().user).toEqual(refreshed.user);
  });

  it('logs out when refreshSession fails', async () => {
    authStore.setState({
      accessToken: 'access-token',
      status: 'authenticated',
      user: session.user,
    });
    vi.mocked(authService.refresh).mockRejectedValue(new Error('bad refresh'));

    await expect(authCommands.refreshSession()).resolves.toBe(false);

    expect(authStore.getState()).toMatchObject({
      accessToken: null,
      status: 'anonymous',
      user: null,
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

  it('updates the user and toasts when revalidation finds a role change', async () => {
    const adminUser: AuthUserDto = {
      ...session.user,
      memberships: [
        { organizationId: 'org-1', organizationName: 'Org', role: 'org_admin' },
      ],
    };
    const staffUser: AuthUserDto = {
      ...adminUser,
      memberships: [
        { organizationId: 'org-1', organizationName: 'Org', role: 'staff' },
      ],
    };
    authStore.setState({
      accessToken: 'access-token',
      status: 'authenticated',
      user: adminUser,
    });
    vi.mocked(authService.me).mockResolvedValue(staffUser);

    await authCommands.revalidateMemberships();

    expect(authStore.getState().user).toEqual(staffUser);
    expect(activeOrgCommands.initialize).toHaveBeenCalledWith(
      staffUser.memberships,
    );
    expect(feedbackCommands.toast).toHaveBeenCalledOnce();
  });

  it('does not toast when revalidation finds no change', async () => {
    const user: AuthUserDto = {
      ...session.user,
      memberships: [
        { organizationId: 'org-1', organizationName: 'Org', role: 'staff' },
      ],
    };
    authStore.setState({
      accessToken: 'access-token',
      status: 'authenticated',
      user,
    });
    vi.mocked(authService.me).mockResolvedValue({ ...user });

    await authCommands.revalidateMemberships();

    expect(feedbackCommands.toast).not.toHaveBeenCalled();
  });

  it('leaves the user untouched when revalidation fails', async () => {
    authStore.setState({
      accessToken: 'access-token',
      status: 'authenticated',
      user: session.user,
    });
    vi.mocked(authService.me).mockRejectedValue(
      new ApiError({
        code: 'UNAUTHORIZED',
        message: 'Session expired.',
        statusCode: 401,
      }),
    );

    await authCommands.revalidateMemberships();

    expect(authStore.getState().user).toEqual(session.user);
    expect(feedbackCommands.toast).not.toHaveBeenCalled();
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
