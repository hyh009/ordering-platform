import { userMongoRepository } from '@src/repositories/user/mongo.repository';

import type { UserEntity } from '@src/models/user/model';

export type CreateUserInput = {
  email: string;
  username: string;
  passwordHash: string;
};

export type UserRepository = {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(input: CreateUserInput): Promise<UserEntity>;
};

export const userRepository: UserRepository = userMongoRepository;
