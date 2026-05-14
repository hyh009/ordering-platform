import { authSessionMongoRepository } from '@src/repositories/authSession/mongo.repository';

import type {
  AuthSessionEntity,
  CreateAuthSessionInput,
} from '@src/models/authSession/model';

export type AuthSessionRepository = {
  findByRefreshTokenHash(
    refreshTokenHash: string,
  ): Promise<AuthSessionEntity | null>;
  consumeActiveRefreshToken(
    refreshTokenHash: string,
    consumedAt: Date,
  ): Promise<AuthSessionEntity | null>;
  create(input: CreateAuthSessionInput): Promise<AuthSessionEntity>;
  revoke(id: string, revokedAt: Date): Promise<void>;
  revokeAllForUser(userId: string, revokedAt: Date): Promise<void>;
};

export const authSessionRepository: AuthSessionRepository =
  authSessionMongoRepository;
