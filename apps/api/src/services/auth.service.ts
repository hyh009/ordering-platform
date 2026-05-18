import { randomBytes, createHash } from 'node:crypto';

import { authConfig } from '@src/config/auth';
import { env } from '@src/config/env';
import { toAuthUserDto } from '@src/models/user/mapper';
import { authSessionRepository } from '@src/repositories/authSession/repository';
import { userRepository } from '@src/repositories/user/repository';
import { ERROR_CODES } from '@src/utils/errorCode';
import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} from '@src/utils/errors';
import { isMongoDuplicateKeyError } from '@src/utils/mongoError';
import bcrypt from 'bcryptjs';
import { sign } from 'jsonwebtoken';

import type { AuthUserDto } from '@repo/shared';
import type { UserEntity } from '@src/models/user/model';

export type AuthResult = {
  user: AuthUserDto;
  accessToken: string;
  refreshToken: string;
};

export type RegisterUserInput = {
  email: string;
  username: string;
  password: string;
};

export type AccessTokenPayload = {
  sub: string;
  isSuperAdmin: boolean;
  tokenVersion: number;
  type: 'access';
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createRefreshToken() {
  return randomBytes(authConfig.refreshTokenLengthBytes).toString('base64url');
}

function hashRefreshToken(refreshToken: string) {
  return createHash('sha256').update(refreshToken).digest('hex');
}

function getRefreshExpiresAt(now = new Date()) {
  return new Date(
    now.getTime() + authConfig.refreshTokenExpiresInSeconds * 1000,
  );
}

function createAccessToken(user: UserEntity) {
  const payload: AccessTokenPayload = {
    sub: user.id,
    isSuperAdmin: user.isSuperAdmin,
    tokenVersion: user.tokenVersion,
    type: 'access',
  };

  return sign(payload, env.AUTH_ACCESS_TOKEN_SECRET, {
    expiresIn: authConfig.accessTokenExpiresInSeconds,
  });
}

async function createAuthResult(user: UserEntity): Promise<AuthResult> {
  const refreshToken = createRefreshToken();

  await authSessionRepository.create({
    userId: user.id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    expiresAt: getRefreshExpiresAt(),
  });

  return {
    user: toAuthUserDto(user),
    accessToken: createAccessToken(user),
    refreshToken,
  };
}

function assertActiveUser(user: UserEntity) {
  if (user.status !== 'active') {
    throw new ForbiddenError('User is disabled', ERROR_CODES.USER_DISABLED);
  }
}

function createInvalidCredentialsError() {
  return new UnauthorizedError(
    'Invalid email or password',
    ERROR_CODES.INVALID_CREDENTIALS,
  );
}

function createInvalidRefreshTokenError() {
  return new UnauthorizedError(
    'Invalid refresh token',
    ERROR_CODES.INVALID_REFRESH_TOKEN,
  );
}

export class AuthService {
  public async register(input: RegisterUserInput) {
    const email = normalizeEmail(input.email);
    const existingUser = await userRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictError(
        'User already exists',
        ERROR_CODES.USER_ALREADY_EXISTS,
      );
    }

    const passwordHash = await bcrypt.hash(
      input.password,
      authConfig.passwordHashRounds,
    );
    let user: UserEntity;

    try {
      user = await userRepository.create({
        email,
        username: input.username,
        passwordHash,
      });
    } catch (error) {
      if (isMongoDuplicateKeyError(error)) {
        throw new ConflictError(
          'User already exists',
          ERROR_CODES.USER_ALREADY_EXISTS,
        );
      }

      throw error;
    }

    return createAuthResult(user);
  }

  public async validateCredentials(email: string, password: string) {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw createInvalidCredentialsError();
    }

    assertActiveUser(user);

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      throw createInvalidCredentialsError();
    }

    return user;
  }

  public async login(user: UserEntity) {
    assertActiveUser(user);

    return createAuthResult(user);
  }

  public async refresh(refreshToken: string | undefined) {
    if (!refreshToken) {
      throw createInvalidRefreshTokenError();
    }

    const now = new Date();
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const session = await authSessionRepository.consumeActiveRefreshToken(
      refreshTokenHash,
      now,
    );

    if (!session) {
      throw createInvalidRefreshTokenError();
    }

    const user = await userRepository.findById(session.userId);

    if (!user) {
      throw createInvalidRefreshTokenError();
    }

    assertActiveUser(user);

    return createAuthResult(user);
  }

  public async logout(refreshToken: string | undefined) {
    if (!refreshToken) {
      return;
    }

    const session = await authSessionRepository.findByRefreshTokenHash(
      hashRefreshToken(refreshToken),
    );

    if (!session || session.revokedAt) {
      return;
    }

    await authSessionRepository.revoke(session.id, new Date());
  }

  public async logoutAll(userId: string) {
    await authSessionRepository.revokeAllForUser(userId, new Date());
  }

  public async findAuthenticatedUser(payload: AccessTokenPayload) {
    if (payload.type !== 'access') {
      return null;
    }

    const user = await userRepository.findById(payload.sub);

    if (!user || user.status !== 'active') {
      return null;
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      return null;
    }

    return toAuthUserDto(user);
  }
}

export function createAuthService() {
  return new AuthService();
}

export const authService = createAuthService();
