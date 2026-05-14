import { env } from '@src/config/env';

export const authCookieNames = {
  refreshToken: 'refresh_token',
} as const;

export const authConfig = {
  accessTokenExpiresInSeconds: env.AUTH_ACCESS_TOKEN_TTL_SECONDS,
  refreshTokenExpiresInSeconds: env.AUTH_REFRESH_TOKEN_TTL_SECONDS,
  refreshTokenLengthBytes: 48,
  passwordHashRounds: 12,
  cookies: {
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    refreshTokenPath: '/api/v1/auth',
  },
} as const;
