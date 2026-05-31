import { randomUUID } from 'node:crypto';

import { AuthSessionMongoModel } from '@src/models/authSession/mongo';

import type {
  AuthSessionEntity,
  CreateAuthSessionInput,
} from '@src/models/authSession/model';

const authSessionEntityKeyCoverage: Record<
  Exclude<
    keyof AuthSessionEntity,
    | 'id'
    | 'userId'
    | 'refreshTokenHash'
    | 'expiresAt'
    | 'revokedAt'
    | 'createdAt'
    | 'updatedAt'
    | 'lastUsedAt'
  >,
  never
> = {};

function toAuthSessionEntity(session: AuthSessionEntity): AuthSessionEntity {
  void authSessionEntityKeyCoverage;

  return {
    id: session.id,
    userId: session.userId,
    refreshTokenHash: session.refreshTokenHash,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt ?? null,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    lastUsedAt: session.lastUsedAt ?? null,
  };
}

export const authSessionMongoRepository = {
  async findByRefreshTokenHash(refreshTokenHash: string) {
    const session = await AuthSessionMongoModel.findOne({ refreshTokenHash })
      .lean<AuthSessionEntity>()
      .exec();

    return session ? toAuthSessionEntity(session) : null;
  },

  async consumeActiveRefreshToken(refreshTokenHash: string, consumedAt: Date) {
    const session = await AuthSessionMongoModel.findOneAndUpdate(
      {
        refreshTokenHash,
        revokedAt: null,
        expiresAt: { $gt: consumedAt },
      },
      {
        $set: {
          lastUsedAt: consumedAt,
          revokedAt: consumedAt,
        },
      },
      {
        new: true,
      },
    )
      .lean<AuthSessionEntity>()
      .exec();

    return session ? toAuthSessionEntity(session) : null;
  },

  async create(input: CreateAuthSessionInput) {
    const session = await AuthSessionMongoModel.create({
      id: `auth-session-${randomUUID()}`,
      userId: input.userId,
      refreshTokenHash: input.refreshTokenHash,
      expiresAt: input.expiresAt,
    });

    return toAuthSessionEntity(session.toObject());
  },

  async revoke(sessionId: string, revokedAt: Date) {
    await AuthSessionMongoModel.updateOne(
      { id: sessionId },
      {
        $set: {
          revokedAt,
        },
      },
    ).exec();
  },

  async revokeAllForUser(userId: string, revokedAt: Date) {
    await AuthSessionMongoModel.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt } },
    ).exec();
  },
};
