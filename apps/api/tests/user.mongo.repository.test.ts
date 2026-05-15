import { describe, expect, it, vi } from 'vitest';

type FindOneQuery = {
  lean: ReturnType<typeof vi.fn>;
  exec: ReturnType<typeof vi.fn>;
};

const mongoMocks = vi.hoisted(() => {
  let nextFindOneResult: unknown = null;

  function createFindOneQuery(): FindOneQuery {
    return {
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn(async () => nextFindOneResult),
    };
  }

  return {
    setNextFindOneResult(result: unknown) {
      nextFindOneResult = result;
    },
    UserMongoModel: {
      findOne: vi.fn(() => createFindOneQuery()),
      create: vi.fn(),
    },
  };
});

vi.mock('@src/models/user/mongo', () => ({
  UserMongoModel: mongoMocks.UserMongoModel,
}));

const { userMongoRepository } =
  await import('../src/repositories/user/mongo.repository.js');

describe('userMongoRepository', () => {
  it('defaults missing isSuperAdmin values from legacy Mongo users to false', async () => {
    const now = new Date('2026-05-15T00:00:00.000Z');

    mongoMocks.setNextFindOneResult({
      id: 'user-legacy',
      email: 'legacy@example.com',
      username: 'legacy-user',
      passwordHash: 'hashed-password',
      status: 'active',
      tokenVersion: 1,
      createdAt: now,
      updatedAt: now,
    });

    const user = await userMongoRepository.findByEmail('legacy@example.com');

    expect(user).toMatchObject({
      id: 'user-legacy',
      email: 'legacy@example.com',
      isSuperAdmin: false,
    });
  });
});
