import { randomUUID } from 'node:crypto';

import { CategoryMongoModel } from '@src/models/category/mongo';

import type { CategoryEntity } from '@src/models/category/model';
import type {
  CreateCategoryInput,
  ListCategoriesByStoreInput,
  UpdateCategoryInput,
} from '@src/repositories/category/repository';

const categoryEntityKeys = [
  'id',
  'organizationId',
  'storeId',
  'name',
  'description',
  'imageUrl',
  'displayOrder',
  'isActive',
  'availabilityRules',
  'createdAt',
  'updatedAt',
] as const satisfies readonly (keyof CategoryEntity)[];

const categoryEntityKeyCoverage: Record<
  Exclude<keyof CategoryEntity, (typeof categoryEntityKeys)[number]>,
  never
> = {};

function toCategoryEntity(doc: CategoryEntity): CategoryEntity {
  void categoryEntityKeyCoverage;

  return Object.fromEntries(
    categoryEntityKeys.map((key) => [key, doc[key]]),
  ) as CategoryEntity;
}

export const categoryMongoRepository = {
  async create(input: CreateCategoryInput) {
    const doc = new CategoryMongoModel({
      id: `category-${randomUUID()}`,
      organizationId: input.organizationId,
      storeId: input.storeId,
      name: input.name,
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.displayOrder !== undefined
        ? { displayOrder: input.displayOrder }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.availabilityRules !== undefined
        ? { availabilityRules: input.availabilityRules }
        : {}),
    });

    await doc.save();
    return toCategoryEntity(doc.toObject());
  },

  async findById(categoryId: string) {
    const doc = await CategoryMongoModel.findOne({ id: categoryId })
      .lean<CategoryEntity>()
      .exec();

    return doc ? toCategoryEntity(doc) : null;
  },

  async listByStore(input: ListCategoriesByStoreInput) {
    const filter: Record<string, unknown> = { storeId: input.storeId };
    if (input.isActive !== undefined) {
      filter.isActive = input.isActive;
    }

    const docs = await CategoryMongoModel.find(filter)
      .sort({ displayOrder: 1, createdAt: 1, id: 1 })
      .lean<CategoryEntity[]>()
      .exec();

    return docs.map(toCategoryEntity);
  },

  async bulkSetDisplayOrder(storeId: string, orderedIds: string[]) {
    const ops = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { id, storeId },
        update: { $set: { displayOrder: index } },
      },
    }));

    await CategoryMongoModel.bulkWrite(ops);
  },

  async update(categoryId: string, input: UpdateCategoryInput) {
    const setUpdate: Record<string, unknown> = {};
    const unsetUpdate: Record<string, ''> = {};

    const set = (path: string, value: unknown) => {
      if (value !== undefined) setUpdate[path] = value;
    };

    set('name', input.name);
    set('description', input.description);
    set('displayOrder', input.displayOrder);
    set('isActive', input.isActive);
    set('availabilityRules', input.availabilityRules);
    if (input.imageUrl === null) {
      unsetUpdate.imageUrl = '';
    } else if (input.imageUrl !== undefined) {
      setUpdate.imageUrl = input.imageUrl;
    }

    if (
      Object.keys(setUpdate).length === 0 &&
      Object.keys(unsetUpdate).length === 0
    ) {
      const existing = await CategoryMongoModel.findOne({ id: categoryId })
        .lean<CategoryEntity>()
        .exec();
      return existing ? toCategoryEntity(existing) : null;
    }

    const update: Record<string, unknown> = {};
    if (Object.keys(setUpdate).length > 0) {
      update.$set = setUpdate;
    }
    if (Object.keys(unsetUpdate).length > 0) {
      update.$unset = unsetUpdate;
    }

    const doc = await CategoryMongoModel.findOneAndUpdate(
      { id: categoryId },
      update,
      { new: true, runValidators: true },
    )
      .lean<CategoryEntity>()
      .exec();

    return doc ? toCategoryEntity(doc) : null;
  },
};
