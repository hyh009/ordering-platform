import { Error as MongooseError } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const findOne = vi.fn();

vi.mock('@src/models/store/mongo', () => ({
  StoreMongoModel: {
    findOne: (...args: unknown[]) => findOne(...args),
  },
}));

const { storeMongoRepository } =
  await import('../src/repositories/store/mongo.repository.js');

type FakeDoc = {
  profile: Record<string, unknown>;
  locale: Record<string, unknown>;
  operation: Record<string, unknown>;
  status: string;
  save: () => Promise<void>;
  toObject: () => Record<string, unknown>;
};

function fakeDoc(save: () => Promise<void>): FakeDoc {
  const doc: FakeDoc = {
    profile: {},
    locale: {},
    operation: {},
    status: 'active',
    save,
    toObject: () => ({
      id: 'store-1',
      organizationId: 'org-1',
      profile: doc.profile,
      locale: doc.locale,
      operation: doc.operation,
      status: doc.status,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  };
  return doc;
}

// Build a real VersionError instance without invoking mongoose internals.
function versionError(): MongooseError.VersionError {
  return Object.create(
    MongooseError.VersionError.prototype,
  ) as MongooseError.VersionError;
}

// Each findOne() call re-reads a fresh document, mirroring the retry loop.
function whenFindOneReturns(...docs: (FakeDoc | null)[]) {
  for (const doc of docs) {
    findOne.mockReturnValueOnce({ exec: () => Promise.resolve(doc) });
  }
}

beforeEach(() => {
  findOne.mockReset();
});

describe('storeMongoRepository.update optimistic lock', () => {
  it('retries on VersionError and succeeds', async () => {
    const failing = fakeDoc(() => Promise.reject(versionError()));
    const succeeding = fakeDoc(() => Promise.resolve());
    whenFindOneReturns(failing, succeeding);

    const result = await storeMongoRepository.update('store-1', {
      status: 'disabled',
    });

    expect(result?.id).toBe('store-1');
    expect(findOne).toHaveBeenCalledTimes(2);
  });

  it('throws ConflictError after exhausting retries', async () => {
    whenFindOneReturns(
      fakeDoc(() => Promise.reject(versionError())),
      fakeDoc(() => Promise.reject(versionError())),
      fakeDoc(() => Promise.reject(versionError())),
    );

    await expect(
      storeMongoRepository.update('store-1', { status: 'disabled' }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(findOne).toHaveBeenCalledTimes(3);
  });

  it('rethrows non-version errors without retrying', async () => {
    whenFindOneReturns(fakeDoc(() => Promise.reject(new Error('boom'))));

    await expect(
      storeMongoRepository.update('store-1', { status: 'disabled' }),
    ).rejects.toThrow('boom');
    expect(findOne).toHaveBeenCalledTimes(1);
  });

  it('returns null when the store does not exist', async () => {
    whenFindOneReturns(null);

    const result = await storeMongoRepository.update('missing', {
      status: 'disabled',
    });

    expect(result).toBeNull();
    expect(findOne).toHaveBeenCalledTimes(1);
  });
});
