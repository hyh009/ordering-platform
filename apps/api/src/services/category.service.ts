import { toCategoryDto } from '@src/models/category/mapper';
import { toAvailabilityRule } from '@src/models/common/availability.mapper';
import { categoryRepository } from '@src/repositories/category/repository';
import { ERROR_CODES } from '@src/utils/errorCode';
import { NotFoundError } from '@src/utils/errors';

import type {
  CategoryActiveFilter,
  CategoryDto,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@repo/shared';

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
}

export function createCategoryService() {
  return new CategoryService();
}

export const categoryService = createCategoryService();
