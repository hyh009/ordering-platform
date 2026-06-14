import { Error as MongooseError } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const findOne = vi.fn();

vi.mock('@src/models/productModifier/mongo', () => ({
  ProductModifierMongoModel: {
    findOne: (...args: unknown[]) => findOne(...args),
  },
}));

const { productModifierMongoRepository } =
  await import('../src/repositories/productModifier/mongo.repository.js');

type FakeDoc = {
  selectionType: string;
  maxSelect: number;
  save: () => Promise<void>;
  toObject: () => Record<string, unknown>;
};

function fakeDoc(save: () => Promise<void>): FakeDoc {
  const doc: FakeDoc = {
    selectionType: 'multiple_choice',
    maxSelect: 2,
    save,
    toObject: () => ({
      id: 'product-modifier-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      name: { 'zh-TW': '尺寸' },
      selectionType: doc.selectionType,
      minSelect: 0,
      maxSelect: doc.maxSelect,
      options: [],
      inheritCategoryAvailability: true,
      availabilityRules: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  };
  return doc;
}

function versionError(): MongooseError.VersionError {
  return Object.create(
    MongooseError.VersionError.prototype,
  ) as MongooseError.VersionError;
}

function whenFindOneReturns(...docs: (FakeDoc | null)[]) {
  for (const doc of docs) {
    findOne.mockReturnValueOnce({ exec: () => Promise.resolve(doc) });
  }
}

beforeEach(() => {
  findOne.mockReset();
});

describe('productModifierMongoRepository.update optimistic lock', () => {
  it('retries on VersionError and succeeds', async () => {
    whenFindOneReturns(
      fakeDoc(() => Promise.reject(versionError())),
      fakeDoc(() => Promise.resolve()),
    );

    const result = await productModifierMongoRepository.update(
      'product-modifier-1',
      { maxSelect: 3 },
    );

    expect(result?.id).toBe('product-modifier-1');
    expect(findOne).toHaveBeenCalledTimes(2);
  });

  it('throws ConflictError after exhausting retries', async () => {
    whenFindOneReturns(
      fakeDoc(() => Promise.reject(versionError())),
      fakeDoc(() => Promise.reject(versionError())),
      fakeDoc(() => Promise.reject(versionError())),
    );

    await expect(
      productModifierMongoRepository.update('product-modifier-1', {
        maxSelect: 3,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(findOne).toHaveBeenCalledTimes(3);
  });

  it('rethrows non-version errors without retrying', async () => {
    whenFindOneReturns(fakeDoc(() => Promise.reject(new Error('boom'))));

    await expect(
      productModifierMongoRepository.update('product-modifier-1', {
        maxSelect: 3,
      }),
    ).rejects.toThrow('boom');
    expect(findOne).toHaveBeenCalledTimes(1);
  });

  it('returns null when the modifier does not exist', async () => {
    whenFindOneReturns(null);

    const result = await productModifierMongoRepository.update('missing', {
      maxSelect: 3,
    });

    expect(result).toBeNull();
    expect(findOne).toHaveBeenCalledTimes(1);
  });
});
