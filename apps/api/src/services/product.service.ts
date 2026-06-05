import { toProductDto } from '@src/models/product/mapper';
import { allergenRepository } from '@src/repositories/allergen/repository';
import { categoryRepository } from '@src/repositories/category/repository';
import { dietaryMarkerRepository } from '@src/repositories/dietaryMarker/repository';
import { productRepository } from '@src/repositories/product/repository';
import { productModifierRepository } from '@src/repositories/productModifier/repository';
import { tagRepository } from '@src/repositories/tag/repository';
import { ERROR_CODES } from '@src/utils/errorCode';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '@src/utils/errors';

import type {
  CreateProductRequest,
  ProductActiveFilter,
  ProductDto,
  ToggleProductSoldOutRequest,
  UpdateProductRequest,
} from '@repo/shared';

function toActiveFilter(isActive: ProductActiveFilter): boolean | undefined {
  if (isActive === 'all') {
    return undefined;
  }

  return isActive === 'true';
}

function assertEveryIdExists(input: {
  field: string;
  requestedIds: string[];
  existingIds: Set<string>;
}) {
  const missingId = input.requestedIds.find((id) => !input.existingIds.has(id));
  if (missingId !== undefined) {
    throw new BadRequestError(
      `Unknown ${input.field} id: ${missingId}`,
      ERROR_CODES.INVALID_FIELD_VALUE,
    );
  }
}

async function assertStoreReferences(input: {
  storeId: string;
  categoryIds?: string[] | undefined;
  tagIds?: string[] | undefined;
  modifierIds?: string[] | undefined;
}) {
  const checks: Promise<void>[] = [];

  if (input.categoryIds !== undefined) {
    const categoryIds = input.categoryIds;
    checks.push(
      categoryRepository
        .listByStore({ storeId: input.storeId, isActive: true })
        .then((categories) => {
          assertEveryIdExists({
            field: 'category',
            requestedIds: categoryIds,
            existingIds: new Set(categories.map((category) => category.id)),
          });
        }),
    );
  }

  if (input.tagIds !== undefined) {
    const tagIds = input.tagIds;
    checks.push(
      tagRepository
        .listByStore({ storeId: input.storeId, isActive: true })
        .then((tags) => {
          assertEveryIdExists({
            field: 'tag',
            requestedIds: tagIds,
            existingIds: new Set(tags.map((tag) => tag.id)),
          });
        }),
    );
  }

  if (input.modifierIds !== undefined) {
    const modifierIds = input.modifierIds;
    checks.push(
      productModifierRepository
        .listByStore({ storeId: input.storeId, isActive: true })
        .then((productModifiers) => {
          assertEveryIdExists({
            field: 'product modifier',
            requestedIds: modifierIds,
            existingIds: new Set(
              productModifiers.map((productModifier) => productModifier.id),
            ),
          });
        }),
    );
  }

  await Promise.all(checks);
}

async function assertPlatformMetadataReferences(input: {
  allergenIds?: string[] | undefined;
  dietaryMarkerIds?: string[] | undefined;
}) {
  const checks: Promise<void>[] = [];

  if (input.allergenIds !== undefined) {
    const allergenIds = input.allergenIds;
    checks.push(
      allergenRepository.list({}).then((allergens) => {
        assertEveryIdExists({
          field: 'allergen',
          requestedIds: allergenIds,
          existingIds: new Set(allergens.map((allergen) => allergen.id)),
        });
      }),
    );
  }

  if (input.dietaryMarkerIds !== undefined) {
    const dietaryMarkerIds = input.dietaryMarkerIds;
    checks.push(
      dietaryMarkerRepository.list({}).then((dietaryMarkers) => {
        assertEveryIdExists({
          field: 'dietary marker',
          requestedIds: dietaryMarkerIds,
          existingIds: new Set(
            dietaryMarkers.map((dietaryMarker) => dietaryMarker.id),
          ),
        });
      }),
    );
  }

  await Promise.all(checks);
}

export class ProductService {
  public async listProducts(
    storeId: string,
    isActive: ProductActiveFilter,
  ): Promise<ProductDto[]> {
    const products = await productRepository.listByStore({
      storeId,
      isActive: toActiveFilter(isActive),
    });

    return products.map(toProductDto);
  }

  public async createProduct(
    storeId: string,
    organizationId: string,
    input: CreateProductRequest,
  ): Promise<ProductDto> {
    await Promise.all([
      assertStoreReferences({
        storeId,
        categoryIds: input.categoryIds,
        tagIds: input.tagIds,
        modifierIds: input.modifierIds,
      }),
      assertPlatformMetadataReferences({
        allergenIds: input.allergenIds,
        dietaryMarkerIds: input.dietaryMarkerIds,
      }),
    ]);

    const product = await productRepository.create({
      organizationId,
      storeId,
      categoryIds: input.categoryIds ?? [],
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl,
      price: input.price,
      tagIds: input.tagIds,
      allergenIds: input.allergenIds,
      dietaryMarkerIds: input.dietaryMarkerIds,
      modifierIds: input.modifierIds,
      isActive: input.isActive,
    });

    return toProductDto(product);
  }

  public async updateProduct(
    storeId: string,
    productId: string,
    input: UpdateProductRequest,
  ): Promise<ProductDto> {
    const existing = await productRepository.findById(productId);

    if (!existing || existing.storeId !== storeId) {
      throw new NotFoundError(
        'Product not found',
        ERROR_CODES.PRODUCT_NOT_FOUND,
      );
    }

    await Promise.all([
      assertStoreReferences({
        storeId,
        categoryIds: input.categoryIds,
        tagIds: input.tagIds,
        modifierIds: input.modifierIds,
      }),
      assertPlatformMetadataReferences({
        allergenIds: input.allergenIds,
        dietaryMarkerIds: input.dietaryMarkerIds,
      }),
    ]);

    const updated = await productRepository.update(
      productId,
      {
        categoryIds: input.categoryIds,
        name: input.name,
        description: input.description,
        imageUrl: input.imageUrl,
        price: input.price,
        tagIds: input.tagIds,
        allergenIds: input.allergenIds,
        dietaryMarkerIds: input.dietaryMarkerIds,
        modifierIds: input.modifierIds,
        isActive: input.isActive,
      },
      { expectedUpdatedAt: existing.updatedAt },
    );

    if (!updated) {
      throw new ConflictError(
        'Product was updated by another request',
        ERROR_CODES.CONFLICT,
      );
    }

    return toProductDto(updated);
  }

  public async toggleProductSoldOut(
    storeId: string,
    productId: string,
    input: ToggleProductSoldOutRequest,
  ): Promise<ProductDto> {
    const existing = await productRepository.findById(productId);

    if (!existing || existing.storeId !== storeId) {
      throw new NotFoundError(
        'Product not found',
        ERROR_CODES.PRODUCT_NOT_FOUND,
      );
    }

    const updated = await productRepository.update(
      productId,
      { isSoldOut: input.isSoldOut },
      { expectedUpdatedAt: existing.updatedAt },
    );

    if (!updated) {
      throw new ConflictError(
        'Product was updated by another request',
        ERROR_CODES.CONFLICT,
      );
    }

    return toProductDto(updated);
  }
}

export function createProductService() {
  return new ProductService();
}

export const productService = createProductService();
