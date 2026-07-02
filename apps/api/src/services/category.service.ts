import { toCategoryDto } from '@src/models/category/mapper';
import { toAvailabilityRule } from '@src/models/common/availability.mapper';
import { categoryRepository } from '@src/repositories/category/repository';
import { productRepository } from '@src/repositories/product/repository';
import { ERROR_CODES } from '@src/utils/errorCode';
import { BadRequestError, NotFoundError } from '@src/utils/errors';

import type {
  CategoryActiveFilter,
  CategoryDto,
  CreateCategoryRequest,
  ReorderCategoriesRequest,
  ReorderCategoryProductsRequest,
  UpdateCategoryRequest,
} from '@repo/shared';
import type { CategoryEntity } from '@src/models/category/model';
import type { ProductEntity } from '@src/models/product/model';

function assertNoDuplicateIds(ids: string[]) {
  const seen = new Set<string>();
  const duplicate = ids.find((id) => {
    if (seen.has(id)) return true;
    seen.add(id);
    return false;
  });

  if (duplicate !== undefined) {
    throw new BadRequestError(
      `Duplicate product id in order: ${duplicate}`,
      ERROR_CODES.INVALID_FIELD_VALUE,
    );
  }
}

function buildNormalizedProductOrder(input: {
  category: CategoryEntity;
  products: ProductEntity[];
  requestedIds: string[];
}) {
  assertNoDuplicateIds(input.requestedIds);

  const productById = new Map(
    input.products.map((product) => [product.id, product]),
  );
  const categoryProductIds = input.products
    .filter((product) => product.categoryIds.includes(input.category.id))
    .map((product) => product.id);
  const categoryProductIdSet = new Set(categoryProductIds);

  for (const productId of input.requestedIds) {
    const product = productById.get(productId);
    if (product === undefined) {
      throw new BadRequestError(
        `Unknown product id: ${productId}`,
        ERROR_CODES.INVALID_FIELD_VALUE,
      );
    }
    if (!product.categoryIds.includes(input.category.id)) {
      throw new BadRequestError(
        `Product does not belong to category: ${productId}`,
        ERROR_CODES.INVALID_FIELD_VALUE,
      );
    }
  }

  const requestedIdSet = new Set(input.requestedIds);
  const existingOrder = input.category.productOrder ?? [];
  const existingOrderSet = new Set(existingOrder);

  return [
    ...input.requestedIds,
    ...existingOrder.filter(
      (productId) =>
        !requestedIdSet.has(productId) && categoryProductIdSet.has(productId),
    ),
    ...categoryProductIds.filter(
      (productId) =>
        !requestedIdSet.has(productId) && !existingOrderSet.has(productId),
    ),
  ];
}

export class CategoryService {
  // Store existence and membership are resolved by requireOrgRole for :storeId.
  public async listCategories(
    storeId: string,
    isActive: CategoryActiveFilter,
  ): Promise<CategoryDto[]> {
    const categories = await categoryRepository.listByStore({
      storeId,
      ...(isActive === 'all' ? {} : { isActive: isActive === 'true' }),
    });

    return categories.map(toCategoryDto);
  }

  public async createCategory(
    storeId: string,
    organizationId: string,
    input: CreateCategoryRequest,
  ): Promise<CategoryDto> {
    const category = await categoryRepository.create({
      organizationId,
      storeId,
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl,
      displayOrder: input.displayOrder,
      isActive: input.isActive,
      availabilityRules: input.availabilityRules?.map(toAvailabilityRule),
    });

    return toCategoryDto(category);
  }

  public async updateCategory(
    storeId: string,
    categoryId: string,
    input: UpdateCategoryRequest,
  ): Promise<CategoryDto> {
    const existing = await categoryRepository.findById(categoryId);

    if (!existing || existing.storeId !== storeId) {
      throw new NotFoundError(
        'Category not found',
        ERROR_CODES.CATEGORY_NOT_FOUND,
      );
    }

    const updated = await categoryRepository.update(categoryId, {
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl,
      displayOrder: input.displayOrder,
      isActive: input.isActive,
      availabilityRules: input.availabilityRules?.map(toAvailabilityRule),
    });

    if (!updated) {
      throw new NotFoundError(
        'Category not found',
        ERROR_CODES.CATEGORY_NOT_FOUND,
      );
    }

    return toCategoryDto(updated);
  }
  public async reorderCategories(
    storeId: string,
    input: ReorderCategoriesRequest,
  ): Promise<void> {
    await categoryRepository.bulkSetDisplayOrder(storeId, input.orderedIds);
  }

  public async reorderCategoryProducts(
    storeId: string,
    categoryId: string,
    input: ReorderCategoryProductsRequest,
  ): Promise<void> {
    const category = await categoryRepository.findById(categoryId);

    if (!category || category.storeId !== storeId) {
      throw new NotFoundError(
        'Category not found',
        ERROR_CODES.CATEGORY_NOT_FOUND,
      );
    }

    const products = await productRepository.listByStore({ storeId });
    const orderedIds = buildNormalizedProductOrder({
      category,
      products,
      requestedIds: input.orderedIds,
    });

    const updated = await categoryRepository.setProductOrder(
      storeId,
      categoryId,
      orderedIds,
    );
    if (!updated) {
      throw new NotFoundError(
        'Category not found',
        ERROR_CODES.CATEGORY_NOT_FOUND,
      );
    }
  }
}

export function createCategoryService() {
  return new CategoryService();
}

export const categoryService = createCategoryService();
