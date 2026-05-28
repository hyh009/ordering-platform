import { userMongoRepository } from '@src/repositories/user/mongo.repository';

import type { UserEntity } from '@src/models/user/model';
import type { ClientSession } from 'mongoose';

export type CreateUserInput = {
  email: string;
  username: string;
  passwordHash: string;
  isSuperAdmin?: boolean;
};

export type UserRepository = {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByIds(ids: string[]): Promise<UserEntity[]>;
  create(input: CreateUserInput, session?: ClientSession): Promise<UserEntity>;
};

export const userRepository: UserRepository = userMongoRepository;
