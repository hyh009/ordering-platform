import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';

type TestUser = {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  isSuperAdmin: boolean;
  status: 'active' | 'disabled';
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

type TestAuthSession = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date | null;
};

const repositoryMocks = vi.hoisted(() => {
  type User = TestUser;
  type AuthSession = TestAuthSession;
  type CreateUserInput = {
    email: string;
    username: string;
    passwordHash: string;
  };
  type CreateAuthSessionInput = {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
  };

  let users: User[] = [];
  let authSessions: AuthSession[] = [];
  let userIdCounter = 1;
  let authSessionIdCounter = 1;
  let shouldRejectNextCreateAsDuplicate = false;

  function cloneUser(user: User): User {
    return {
      ...user,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    };
  }

  function cloneAuthSession(session: AuthSession): AuthSession {
    return {
      ...session,
      expiresAt: new Date(session.expiresAt),
      revokedAt: session.revokedAt ? new Date(session.revokedAt) : null,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt),
      lastUsedAt: session.lastUsedAt ? new Date(session.lastUsedAt) : null,
    };
  }

  function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  return {
    userRepository: {
      async findById(userId: string) {
        const user = users.find((item) => item.id === userId);

        return user ? cloneUser(user) : null;
      },

      async findByEmail(email: string) {
        const user = users.find((item) => item.email === normalizeEmail(email));

        return user ? cloneUser(user) : null;
      },

      async create(input: CreateUserInput) {
        if (shouldRejectNextCreateAsDuplicate) {
          shouldRejectNextCreateAsDuplicate = false;
          throw { code: 11000 };
        }

        const now = new Date();
        const user: User = {
          id: `user-${userIdCounter}`,
          email: normalizeEmail(input.email),
          username: input.username.trim(),
          passwordHash: input.passwordHash,
          isSuperAdmin: false,
          status: 'active',
          tokenVersion: 1,
          createdAt: now,
          updatedAt: now,
        };

        userIdCounter += 1;
        users = [...users, user];

        return cloneUser(user);
      },
    },
    authSessionRepository: {
      async findByRefreshTokenHash(refreshTokenHash: string) {
        const session = authSessions.find(
          (item) => item.refreshTokenHash === refreshTokenHash,
        );

        return session ? cloneAuthSession(session) : null;
      },

      async consumeActiveRefreshToken(
        refreshTokenHash: string,
        consumedAt: Date,
      ) {
        const session = authSessions.find(
          (item) =>
            item.refreshTokenHash === refreshTokenHash &&
            !item.revokedAt &&
            item.expiresAt.getTime() > consumedAt.getTime(),
        );

        if (!session) {
          return null;
        }

        authSessions = authSessions.map((item) =>
          item.id === session.id
            ? {
                ...item,
                lastUsedAt: consumedAt,
                revokedAt: consumedAt,
                updatedAt: consumedAt,
              }
            : item,
        );

        return cloneAuthSession({
          ...session,
          lastUsedAt: consumedAt,
          revokedAt: consumedAt,
          updatedAt: consumedAt,
        });
      },

      async create(input: CreateAuthSessionInput) {
        const now = new Date();
        const session: AuthSession = {
          id: `auth-session-${authSessionIdCounter}`,
          userId: input.userId,
          refreshTokenHash: input.refreshTokenHash,
          expiresAt: input.expiresAt,
          revokedAt: null,
          createdAt: now,
          updatedAt: now,
          lastUsedAt: null,
        };

        authSessionIdCounter += 1;
        authSessions = [...authSessions, session];

        return cloneAuthSession(session);
      },

      async revoke(sessionId: string, revokedAt: Date) {
        authSessions = authSessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                revokedAt,
                updatedAt: revokedAt,
              }
            : session,
        );
      },

      async revokeAllForUser(userId: string, revokedAt: Date) {
        authSessions = authSessions.map((session) =>
          session.userId === userId && !session.revokedAt
            ? { ...session, revokedAt, updatedAt: revokedAt }
            : session,
        );
      },
    },
    reset() {
      users = [];
      authSessions = [];
      userIdCounter = 1;
      authSessionIdCounter = 1;
      shouldRejectNextCreateAsDuplicate = false;
    },
    rejectNextUserCreateAsDuplicate() {
      shouldRejectNextCreateAsDuplicate = true;
    },
  };
});

vi.mock('@src/repositories/user/repository', () => ({
  userRepository: repositoryMocks.userRepository,
}));

vi.mock('@src/repositories/authSession/repository', () => ({
  authSessionRepository: repositoryMocks.authSessionRepository,
}));

const credentials = {
  email: 'user@example.com',
  username: 'ordering-user',
  password: 'Password123',
};

function getCookie(response: request.Response, cookieName: string) {
  const setCookieHeader = response.headers['set-cookie'];
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];

  return cookies.find(
    (cookie): cookie is string =>
      typeof cookie === 'string' && cookie.startsWith(`${cookieName}=`),
  );
}

function getAccessToken(response: request.Response) {
  return response.body?.data?.accessToken as string | undefined;
}

function authorizationHeader(accessToken: string | undefined) {
  return `Bearer ${accessToken ?? ''}`;
}

describe('auth API', () => {
  beforeEach(() => {
    repositoryMocks.reset();
  });

  it('registers a user, sets a refresh cookie, and returns an access token', async () => {
    const app = createApp();
    const agent = request.agent(app);

    const registerResponse = await agent
      .post('/api/v1/auth/register')
      .send(credentials);

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body).toMatchObject({
      status: 'success',
      data: {
        accessToken: expect.any(String),
        user: {
          email: credentials.email,
          username: credentials.username,
          isSuperAdmin: false,
        },
      },
    });
    expect(registerResponse.body.data.user.id).toEqual(
      expect.stringMatching(/^user-/),
    );
    expect(registerResponse.body.data.user.passwordHash).toBeUndefined();
    expect(getCookie(registerResponse, 'access_token')).toBeUndefined();
    expect(getCookie(registerResponse, 'refresh_token')).toContain('HttpOnly');

    const meResponse = await agent
      .get('/api/v1/auth/me')
      .set(
        'Authorization',
        authorizationHeader(getAccessToken(registerResponse)),
      );

    expect(meResponse.status).toBe(200);
    expect(meResponse.body).toMatchObject({
      status: 'success',
      data: {
        user: {
          email: credentials.email,
          username: credentials.username,
          isSuperAdmin: false,
        },
      },
    });
  });

  it('rejects duplicate registration with USER_ALREADY_EXISTS', async () => {
    const app = createApp();

    await request(app)
      .post('/api/v1/auth/register')
      .send(credentials)
      .expect(201);

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(credentials);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      status: 'error',
      statusCode: 409,
      code: 'USER_ALREADY_EXISTS',
      message: 'User already exists',
    });
  });

  it('maps duplicate registration races to USER_ALREADY_EXISTS', async () => {
    const app = createApp();

    repositoryMocks.rejectNextUserCreateAsDuplicate();

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(credentials);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      status: 'error',
      statusCode: 409,
      code: 'USER_ALREADY_EXISTS',
      message: 'User already exists',
    });
  });

  it('logs in with valid credentials', async () => {
    const app = createApp();
    const agent = request.agent(app);

    await request(app)
      .post('/api/v1/auth/register')
      .send(credentials)
      .expect(201);

    const loginResponse = await agent.post('/api/v1/auth/login').send({
      email: credentials.email,
      password: credentials.password,
    });

    expect(loginResponse.status).toBe(200);
    expect(getAccessToken(loginResponse)).toEqual(expect.any(String));
    expect(getCookie(loginResponse, 'access_token')).toBeUndefined();
    expect(getCookie(loginResponse, 'refresh_token')).toContain('HttpOnly');

    const meResponse = await agent
      .get('/api/v1/auth/me')
      .set('Authorization', authorizationHeader(getAccessToken(loginResponse)));

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data.user.email).toBe(credentials.email);
  });

  it('rejects invalid credentials with INVALID_CREDENTIALS', async () => {
    const app = createApp();

    await request(app)
      .post('/api/v1/auth/register')
      .send(credentials)
      .expect(201);

    const response = await request(app).post('/api/v1/auth/login').send({
      email: credentials.email,
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      status: 'error',
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });
  });

  it('refreshes cookies and rejects reuse of the old refresh token', async () => {
    const app = createApp();
    const agent = request.agent(app);

    const registerResponse = await agent
      .post('/api/v1/auth/register')
      .send(credentials);
    const oldRefreshCookie = getCookie(registerResponse, 'refresh_token');

    expect(oldRefreshCookie).toEqual(expect.any(String));

    const refreshResponse = await agent.post('/api/v1/auth/refresh');

    expect(refreshResponse.status).toBe(200);
    expect(getAccessToken(refreshResponse)).toEqual(expect.any(String));
    expect(getCookie(refreshResponse, 'access_token')).toBeUndefined();
    expect(getCookie(refreshResponse, 'refresh_token')).toContain('HttpOnly');

    const reuseResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', oldRefreshCookie ?? '');

    expect(reuseResponse.status).toBe(401);
    expect(reuseResponse.body).toMatchObject({
      status: 'error',
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Invalid refresh token',
    });
  });

  it('allows only one concurrent refresh request to consume a refresh token', async () => {
    const app = createApp();
    const agent = request.agent(app);

    const registerResponse = await agent
      .post('/api/v1/auth/register')
      .send(credentials);
    const oldRefreshCookie = getCookie(registerResponse, 'refresh_token');

    expect(oldRefreshCookie).toEqual(expect.any(String));

    const responses = await Promise.all([
      request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', oldRefreshCookie ?? ''),
      request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', oldRefreshCookie ?? ''),
    ]);
    const statuses = responses
      .map((response) => response.status)
      .sort((left, right) => left - right);

    expect(statuses).toEqual([200, 401]);
    expect(
      responses.find((response) => response.status === 401)?.body,
    ).toMatchObject({
      status: 'error',
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Invalid refresh token',
    });
  });

  it('logs out and revokes the current refresh token', async () => {
    const app = createApp();
    const agent = request.agent(app);

    await agent.post('/api/v1/auth/register').send(credentials).expect(201);

    const logoutResponse = await agent.post('/api/v1/auth/logout');

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body).toEqual({
      status: 'success',
      data: {
        ok: true,
      },
    });

    const refreshResponse = await agent.post('/api/v1/auth/refresh');

    expect(refreshResponse.status).toBe(401);
    expect(refreshResponse.body.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('rejects protected routes without an access token', async () => {
    const app = createApp();

    const response = await request(app).get('/api/v1/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      status: 'error',
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  });
});
