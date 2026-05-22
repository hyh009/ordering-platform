import { describe, expect, it, vi } from 'vitest';

import { initSuperAdmin } from '../src/scripts/initSuperAdmin.js';

import type { UserEntity } from '../src/models/user/model.js';
import type { InitSuperAdminDependencies } from '../src/scripts/initSuperAdmin.js';

function createUser(overrides: Partial<UserEntity> = {}): UserEntity {
  const now = new Date('2026-05-21T00:00:00.000Z');

  return {
    id: 'user-admin',
    email: 'admin@example.com',
    username: 'admin',
    passwordHash: 'hashed-password',
    isSuperAdmin: true,
    status: 'active',
    tokenVersion: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createValidEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    INIT_SUPER_ADMIN_EMAIL: 'Admin@Example.com',
    INIT_SUPER_ADMIN_USERNAME: 'admin',
    INIT_SUPER_ADMIN_PASSWORD: 'ChangeMe123',
    ...overrides,
  };
}

function createDependencies(
  existingUser: UserEntity | null = null,
): InitSuperAdminDependencies & {
  findUserByEmail: ReturnType<typeof vi.fn>;
  createUser: ReturnType<typeof vi.fn>;
  hashPassword: ReturnType<typeof vi.fn>;
} {
  return {
    findUserByEmail: vi.fn(async () => existingUser),
    createUser: vi.fn(async (input) =>
      createUser({
        email: input.email,
        username: input.username,
        passwordHash: input.passwordHash,
        isSuperAdmin: input.isSuperAdmin,
      }),
    ),
    hashPassword: vi.fn(async () => 'hashed-password'),
  };
}

describe('initSuperAdmin', () => {
  it('rejects missing init environment variables', async () => {
    const dependencies = createDependencies();

    await expect(initSuperAdmin({}, dependencies)).rejects.toThrow(
      'Missing init environment variables',
    );

    expect(dependencies.findUserByEmail).not.toHaveBeenCalled();
    expect(dependencies.createUser).not.toHaveBeenCalled();
  });

  it('validates password using registration rules', async () => {
    const dependencies = createDependencies();

    await expect(
      initSuperAdmin(
        createValidEnv({
          INIT_SUPER_ADMIN_PASSWORD: 'weak',
        }),
        dependencies,
      ),
    ).rejects.toThrow('Password must be 8-128 characters');

    expect(dependencies.findUserByEmail).not.toHaveBeenCalled();
    expect(dependencies.createUser).not.toHaveBeenCalled();
  });

  it('creates a super admin when the user does not exist', async () => {
    const dependencies = createDependencies();

    const result = await initSuperAdmin(createValidEnv(), dependencies);

    expect(result).toEqual({
      code: 0,
      message: 'Super admin created: admin@example.com (user-admin)',
    });
    expect(dependencies.findUserByEmail).toHaveBeenCalledWith(
      'admin@example.com',
    );
    expect(dependencies.hashPassword).toHaveBeenCalledWith('ChangeMe123');
    expect(dependencies.createUser).toHaveBeenCalledWith({
      email: 'admin@example.com',
      username: 'admin',
      passwordHash: 'hashed-password',
      isSuperAdmin: true,
    });
  });

  it('does not write when an active super admin already exists', async () => {
    const dependencies = createDependencies(createUser());

    const result = await initSuperAdmin(createValidEnv(), dependencies);

    expect(result).toEqual({
      code: 0,
      message: 'Super admin already exists: admin@example.com (user-admin)',
    });
    expect(dependencies.hashPassword).not.toHaveBeenCalled();
    expect(dependencies.createUser).not.toHaveBeenCalled();
  });

  it('does not write and fails when the existing user is not a super admin', async () => {
    const dependencies = createDependencies(
      createUser({
        isSuperAdmin: false,
      }),
    );

    const result = await initSuperAdmin(createValidEnv(), dependencies);

    expect(result.code).toBe(1);
    expect(result.message).toContain(
      'User already exists but is not an active super admin',
    );
    expect(dependencies.hashPassword).not.toHaveBeenCalled();
    expect(dependencies.createUser).not.toHaveBeenCalled();
  });

  it('does not write and fails when the existing user is disabled', async () => {
    const dependencies = createDependencies(
      createUser({
        status: 'disabled',
      }),
    );

    const result = await initSuperAdmin(createValidEnv(), dependencies);

    expect(result.code).toBe(1);
    expect(result.message).toContain(
      'User already exists but is not an active super admin',
    );
    expect(dependencies.hashPassword).not.toHaveBeenCalled();
    expect(dependencies.createUser).not.toHaveBeenCalled();
  });
});
