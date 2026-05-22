import { registerSchema } from '@repo/shared';
import { authConfig } from '@src/config/auth';
import { userRepository } from '@src/repositories/user/repository';
import { isMongoDuplicateKeyError } from '@src/utils/mongoError';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import type { UserEntity } from '@src/models/user/model';
import type { UserRepository } from '@src/repositories/user/repository';

type InitSuperAdminInput = {
  email: string;
  username: string;
  password: string;
};

type InitSuperAdminResult = {
  code: number;
  message: string;
};

export type InitSuperAdminDependencies = {
  findUserByEmail(email: string): Promise<UserEntity | null>;
  createUser(input: {
    email: string;
    username: string;
    passwordHash: string;
    isSuperAdmin: true;
  }): Promise<UserEntity>;
  hashPassword(password: string): Promise<string>;
};

const initSuperAdminEnvSchema = z.object({
  INIT_SUPER_ADMIN_EMAIL: z.string().min(1),
  INIT_SUPER_ADMIN_USERNAME: z.string().min(1),
  INIT_SUPER_ADMIN_PASSWORD: z.string().min(1),
});

function createDependencies(
  repository: UserRepository,
): InitSuperAdminDependencies {
  return {
    findUserByEmail(email) {
      return repository.findByEmail(email);
    },
    createUser(input) {
      return repository.create(input);
    },
    hashPassword(password) {
      return bcrypt.hash(password, authConfig.passwordHashRounds);
    },
  };
}

export function parseInitSuperAdminInput(
  env: NodeJS.ProcessEnv,
): InitSuperAdminInput {
  const parsedEnv = initSuperAdminEnvSchema.safeParse(env);

  if (!parsedEnv.success) {
    const missingVars = parsedEnv.error.issues
      .map((issue) => issue.path.join('.'))
      .join(', ');

    throw new Error(`Missing init environment variables: ${missingVars}`);
  }

  const parsedInput = registerSchema.safeParse({
    email: parsedEnv.data.INIT_SUPER_ADMIN_EMAIL,
    username: parsedEnv.data.INIT_SUPER_ADMIN_USERNAME,
    password: parsedEnv.data.INIT_SUPER_ADMIN_PASSWORD,
  });

  if (!parsedInput.success) {
    const message = parsedInput.error.issues
      .map((issue) => {
        const path = issue.path.join('.') || 'input';
        return `${path}: ${issue.message}`;
      })
      .join('; ');

    throw new Error(`Invalid super admin init input: ${message}`);
  }

  return parsedInput.data;
}

export async function initSuperAdmin(
  env: NodeJS.ProcessEnv,
  dependencies: InitSuperAdminDependencies = createDependencies(userRepository),
): Promise<InitSuperAdminResult> {
  return initSuperAdminWithInput(parseInitSuperAdminInput(env), dependencies);
}

export async function initSuperAdminWithInput(
  input: InitSuperAdminInput,
  dependencies: InitSuperAdminDependencies = createDependencies(userRepository),
): Promise<InitSuperAdminResult> {
  const existingUser = await dependencies.findUserByEmail(input.email);

  if (existingUser) {
    if (existingUser.status === 'active' && existingUser.isSuperAdmin) {
      return {
        code: 0,
        message: `Super admin already exists: ${existingUser.email} (${existingUser.id})`,
      };
    }

    return {
      code: 1,
      message:
        `User already exists but is not an active super admin: ${existingUser.email} (${existingUser.id}). ` +
        'No changes were made.',
    };
  }

  const passwordHash = await dependencies.hashPassword(input.password);

  try {
    const user = await dependencies.createUser({
      email: input.email,
      username: input.username,
      passwordHash,
      isSuperAdmin: true,
    });

    return {
      code: 0,
      message: `Super admin created: ${user.email} (${user.id})`,
    };
  } catch (error) {
    if (isMongoDuplicateKeyError(error)) {
      return {
        code: 1,
        message:
          `User already exists for ${input.email}. No changes were made. ` +
          'Run the script again to verify whether it is an active super admin.',
      };
    }

    throw error;
  }
}
