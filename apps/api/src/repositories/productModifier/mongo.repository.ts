import { randomUUID } from 'node:crypto';

import { ProductModifierMongoModel } from '@src/models/productModifier/mongo';

import type { ProductModifierEntity } from '@src/models/productModifier/model';
import type {
  CreateProductModifierInput,
  ListProductModifiersByStoreInput,
  UpdateProductModifierInput,
  UpdateProductModifierOptions,
} from '@src/repositories/productModifier/repository';

const productModifierEntityKeys = [
  'id',
  'organizationId',
  'storeId',
  'name',
  'selectionType',
  'minSelect',
  'maxSelect',
  'displayOrder',
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
      ...(input.displayOrder !== undefined
        ? { displayOrder: input.displayOrder }
        : {}),
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
      .sort({ displayOrder: 1, createdAt: 1, id: 1 })
      .lean<ProductModifierEntity[]>()
      .exec();

    return docs.map(toProductModifierEntity);
  },

  async update(
    productModifierId: string,
    input: UpdateProductModifierInput,
    options?: UpdateProductModifierOptions,
  ) {
    const update: Record<string, unknown> = {};

    const set = (path: string, value: unknown) => {
      if (value !== undefined) update[path] = value;
    };

    set('name', input.name);
    set('selectionType', input.selectionType);
    set('minSelect', input.minSelect);
    set('maxSelect', input.maxSelect);
    set('displayOrder', input.displayOrder);
    set('options', input.options);
    set('inheritCategoryAvailability', input.inheritCategoryAvailability);
    set('availabilityRules', input.availabilityRules);
    set('isActive', input.isActive);

    if (Object.keys(update).length === 0) {
      const existing = await ProductModifierMongoModel.findOne({
        id: productModifierId,
      })
        .lean<ProductModifierEntity>()
        .exec();

      return existing ? toProductModifierEntity(existing) : null;
    }

    const filter: Record<string, unknown> = { id: productModifierId };
    if (options?.expectedUpdatedAt !== undefined) {
      filter.updatedAt = options.expectedUpdatedAt;
    }

    const doc = await ProductModifierMongoModel.findOneAndUpdate(
      filter,
      { $set: update },
      { new: true, runValidators: true },
    )
      .lean<ProductModifierEntity>()
      .exec();

    return doc ? toProductModifierEntity(doc) : null;
  },
};
