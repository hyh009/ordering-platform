import { randomUUID } from 'node:crypto';

import { ProductModifierMongoModel } from '@src/models/productModifier/mongo';
import { ConflictError } from '@src/utils/errors';
import { Error as MongooseError } from 'mongoose';

import type { ProductModifierEntity } from '@src/models/productModifier/model';
import type {
  CreateProductModifierInput,
  ListProductModifiersByStoreInput,
  UpdateProductModifierInput,
} from '@src/repositories/productModifier/repository';

const OPTIMISTIC_WRITE_ATTEMPTS = 3;

const productModifierEntityKeys = [
  'id',
  'organizationId',
  'storeId',
  'name',
  'selectionType',
  'minSelect',
  'maxSelect',
  'options',
  'inheritCategoryAvailability',
  'availabilityRules',
  'isActive',
  'createdAt',
  'updatedAt',
] as const satisfies readonly (keyof ProductModifierEntity)[];

const productModifierEntityKeyCoverage: Record<
  Exclude<
    keyof ProductModifierEntity,
    (typeof productModifierEntityKeys)[number]
  >,
  never
> = {};

function toProductModifierEntity(
  doc: ProductModifierEntity,
): ProductModifierEntity {
  void productModifierEntityKeyCoverage;

  return Object.fromEntries(
    productModifierEntityKeys.map((key) => [key, doc[key]]),
  ) as ProductModifierEntity;
}

export const productModifierMongoRepository = {
  async create(input: CreateProductModifierInput) {
    const doc = new ProductModifierMongoModel({
      id: `product-modifier-${randomUUID()}`,
      organizationId: input.organizationId,
      storeId: input.storeId,
      name: input.name,
      selectionType: input.selectionType,
      minSelect: input.minSelect,
      maxSelect: input.maxSelect,
      options: input.options,
      ...(input.inheritCategoryAvailability !== undefined
        ? {
            inheritCategoryAvailability: input.inheritCategoryAvailability,
          }
        : {}),
      ...(input.availabilityRules !== undefined
        ? { availabilityRules: input.availabilityRules }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });

    await doc.save();
    return toProductModifierEntity(doc.toObject());
  },

  async findById(productModifierId: string) {
    const doc = await ProductModifierMongoModel.findOne({
      id: productModifierId,
    })
      .lean<ProductModifierEntity>()
      .exec();

    return doc ? toProductModifierEntity(doc) : null;
  },

  async listByStore(input: ListProductModifiersByStoreInput) {
    const filter: Record<string, unknown> = { storeId: input.storeId };
    if (input.isActive !== undefined) {
      filter.isActive = input.isActive;
    }

    const docs = await ProductModifierMongoModel.find(filter)
      .sort({ createdAt: 1, id: 1 })
      .lean<ProductModifierEntity[]>()
      .exec();

    return docs.map(toProductModifierEntity);
  },

  async update(productModifierId: string, input: UpdateProductModifierInput) {
    // Read-modify-write via findOne + save so the cross-field validators
    // (maxSelect >= minSelect; single_choice ⇒ maxSelect === 1) run on the
    // merged document. optimisticConcurrency guards the stale-save race; the
    // input is a pure patch, so re-reading and re-applying on conflict is safe.
    // See docs/features/concurrency-control.md.
    for (let attempt = 1; ; attempt += 1) {
      const doc = await ProductModifierMongoModel.findOne({
        id: productModifierId,
      }).exec();
      if (!doc) return null;

      if (input.name !== undefined) doc.name = input.name;
      if (input.selectionType !== undefined)
        doc.selectionType = input.selectionType;
      if (input.minSelect !== undefined) doc.minSelect = input.minSelect;
      if (input.maxSelect !== undefined) doc.maxSelect = input.maxSelect;
      if (input.options !== undefined) doc.options = input.options;
      if (input.inheritCategoryAvailability !== undefined)
        doc.inheritCategoryAvailability = input.inheritCategoryAvailability;
      if (input.availabilityRules !== undefined)
        doc.availabilityRules = input.availabilityRules;
      if (input.isActive !== undefined) doc.isActive = input.isActive;

      try {
        await doc.save();
        return toProductModifierEntity(doc.toObject());
      } catch (error) {
        const isVersionConflict = error instanceof MongooseError.VersionError;
        if (isVersionConflict && attempt < OPTIMISTIC_WRITE_ATTEMPTS) continue;
        if (isVersionConflict) {
          throw new ConflictError(
            'Product modifier was modified concurrently, please retry',
          );
        }
        throw error;
      }
    }
  },
};
