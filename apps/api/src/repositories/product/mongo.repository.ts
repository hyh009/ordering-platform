import { randomUUID } from 'node:crypto';

import { ProductMongoModel } from '@src/models/product/mongo';

import type { ProductEntity } from '@src/models/product/model';
import type {
  CreateProductInput,
  ListProductsByStoreInput,
  UpdateProductInput,
  UpdateProductOptions,
} from '@src/repositories/product/repository';

const productEntityKeys = [
  'id',
  'organizationId',
  'storeId',
  'categoryIds',
  'name',
  'description',
  'imageUrl',
  'price',
  'tagIds',
  'allergenIds',
  'dietaryMarkerIds',
  'modifierIds',
  'isActive',
  'isSoldOut',
  'createdAt',
  'updatedAt',
] as const satisfies readonly (keyof ProductEntity)[];

const productEntityKeyCoverage: Record<
  Exclude<keyof ProductEntity, (typeof productEntityKeys)[number]>,
  never
> = {};

function toProductEntity(doc: ProductEntity): ProductEntity {
  void productEntityKeyCoverage;

  return Object.fromEntries(
    productEntityKeys.map((key) => [key, doc[key]]),
  ) as ProductEntity;
}

export const productMongoRepository = {
  async create(input: CreateProductInput) {
    const doc = new ProductMongoModel({
      id: `product-${randomUUID()}`,
      organizationId: input.organizationId,
      storeId: input.storeId,
      categoryIds: input.categoryIds,
      name: input.name,
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      price: input.price,
      ...(input.tagIds !== undefined ? { tagIds: input.tagIds } : {}),
      ...(input.allergenIds !== undefined
        ? { allergenIds: input.allergenIds }
        : {}),
      ...(input.dietaryMarkerIds !== undefined
        ? { dietaryMarkerIds: input.dietaryMarkerIds }
        : {}),
      ...(input.modifierIds !== undefined
        ? { modifierIds: input.modifierIds }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });

    await doc.save();
    return toProductEntity(doc.toObject());
  },

  async findById(productId: string) {
    const doc = await ProductMongoModel.findOne({ id: productId })
      .lean<ProductEntity>()
      .exec();

    return doc ? toProductEntity(doc) : null;
  },

  async listByStore(input: ListProductsByStoreInput) {
    const filter: Record<string, unknown> = { storeId: input.storeId };
    if (input.isActive !== undefined) {
      filter.isActive = input.isActive;
    }

    const docs = await ProductMongoModel.find(filter)
      .sort({ createdAt: 1, id: 1 })
      .lean<ProductEntity[]>()
      .exec();

    return docs.map(toProductEntity);
  },

  async update(
    productId: string,
    input: UpdateProductInput,
    options?: UpdateProductOptions,
  ) {
    const setUpdate: Record<string, unknown> = {};
    const unsetUpdate: Record<string, ''> = {};

    const set = (path: string, value: unknown) => {
      if (value !== undefined) setUpdate[path] = value;
    };

    set('categoryIds', input.categoryIds);
    set('name', input.name);
    set('description', input.description);
    set('price', input.price);
    set('tagIds', input.tagIds);
    set('allergenIds', input.allergenIds);
    set('dietaryMarkerIds', input.dietaryMarkerIds);
    set('modifierIds', input.modifierIds);
    set('isActive', input.isActive);
    set('isSoldOut', input.isSoldOut);
    if (input.imageUrl === null) {
      unsetUpdate.imageUrl = '';
    } else if (input.imageUrl !== undefined) {
      setUpdate.imageUrl = input.imageUrl;
    }

    if (
      Object.keys(setUpdate).length === 0 &&
      Object.keys(unsetUpdate).length === 0
    ) {
      const existing = await ProductMongoModel.findOne({ id: productId })
        .lean<ProductEntity>()
        .exec();

      return existing ? toProductEntity(existing) : null;
    }

    const filter: Record<string, unknown> = { id: productId };
    if (options?.expectedUpdatedAt !== undefined) {
      filter.updatedAt = options.expectedUpdatedAt;
    }

    const update: Record<string, unknown> = {};
    if (Object.keys(setUpdate).length > 0) {
      update.$set = setUpdate;
    }
    if (Object.keys(unsetUpdate).length > 0) {
      update.$unset = unsetUpdate;
    }

    const doc = await ProductMongoModel.findOneAndUpdate(filter, update, {
      new: true,
      runValidators: true,
    })
      .lean<ProductEntity>()
      .exec();

    return doc ? toProductEntity(doc) : null;
  },
};
