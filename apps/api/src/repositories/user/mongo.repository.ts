import { randomUUID } from 'node:crypto';

import { UserMongoModel } from '@src/models/user/mongo';

import type { UserEntity } from '@src/models/user/model';
import type { CreateUserInput } from '@src/repositories/user/repository';

type MongoUserRecord = Omit<UserEntity, 'isSuperAdmin'> & {
  isSuperAdmin?: boolean;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toUserEntity(user: MongoUserRecord): UserEntity {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    passwordHash: user.passwordHash,
    isSuperAdmin: user.isSuperAdmin ?? false,
    status: user.status,
    tokenVersion: user.tokenVersion,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const userMongoRepository = {
  async findById(userId: string) {
    const user = await UserMongoModel.findOne({ id: userId })
      .lean<UserEntity>()
      .exec();

    return user ? toUserEntity(user) : null;
  },

  async findByEmail(email: string) {
    const user = await UserMongoModel.findOne({ email: normalizeEmail(email) })
      .lean<UserEntity>()
      .exec();

    return user ? toUserEntity(user) : null;
  },

  async create(input: CreateUserInput) {
    const user = await UserMongoModel.create({
      id: `user-${randomUUID()}`,
      email: normalizeEmail(input.email),
      username: input.username.trim(),
      passwordHash: input.passwordHash,
      isSuperAdmin: input.isSuperAdmin ?? false,
      status: 'active',
      tokenVersion: 1,
    });

    return toUserEntity(user.toObject());
  },
};
