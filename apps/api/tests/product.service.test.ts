import { createProductService } from '@src/services/product.service';
import { BadRequestError, ConflictError } from '@src/utils/errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const productRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    listByStore: vi.fn(),
    update: vi.fn(),
  };
  const categoryRepository = {
    listByStore: vi.fn(),
  };
  const tagRepository = {
    listByStore: vi.fn(),
  };
  const productModifierRepository = {
    listByStore: vi.fn(),
  };
  const allergenRepository = {
    list: vi.fn(),
  };
  const dietaryMarkerRepository = {
    list: vi.fn(),
  };

  return {
    productRepository,
    categoryRepository,
    tagRepository,
    productModifierRepository,
    allergenRepository,
    dietaryMarkerRepository,
  };
});

vi.mock('@src/repositories/product/repository', () => ({
  productRepository: mocks.productRepository,
}));

vi.mock('@src/repositories/category/repository', () => ({
  categoryRepository: mocks.categoryRepository,
}));

vi.mock('@src/repositories/tag/repository', () => ({
  tagRepository: mocks.tagRepository,
}));

vi.mock('@src/repositories/productModifier/repository', () => ({
  productModifierRepository: mocks.productModifierRepository,
}));

vi.mock('@src/repositories/allergen/repository', () => ({
  allergenRepository: mocks.allergenRepository,
}));

vi.mock('@src/repositories/dietaryMarker/repository', () => ({
  dietaryMarkerRepository: mocks.dietaryMarkerRepository,
}));

function productEntity(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-06-05T08:00:00.000Z');

  return {
    id: 'product-1',
    organizationId: 'org-1',
    storeId: 'store-1',
    categoryIds: ['category-1'],
    name: { 'zh-TW': '拿鐵' },
    price: 120,
    tagIds: [],
    allergenIds: [],
    dietaryMarkerIds: [],
    modifierIds: [],
    isActive: true,
    isSoldOut: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('product service', () => {
  beforeEach(() => {
    mocks.productRepository.create.mockReset();
    mocks.productRepository.findById.mockReset();
    mocks.productRepository.listByStore.mockReset();
    mocks.productRepository.update.mockReset();
    mocks.categoryRepository.listByStore.mockReset();
    mocks.tagRepository.listByStore.mockReset();
    mocks.productModifierRepository.listByStore.mockReset();
    mocks.allergenRepository.list.mockReset();
    mocks.dietaryMarkerRepository.list.mockReset();
  });

  it('rejects unknown store-owned references before creating', async () => {
    const service = createProductService();

    mocks.categoryRepository.listByStore.mockResolvedValue([
      productEntity({ id: 'category-1' }),
    ]);
    mocks.tagRepository.listByStore.mockResolvedValue([]);
    mocks.productModifierRepository.listByStore.mockResolvedValue([]);
    mocks.allergenRepository.list.mockResolvedValue([]);
    mocks.dietaryMarkerRepository.list.mockResolvedValue([]);

    await expect(
      service.createProduct('store-1', 'org-1', {
        categoryIds: ['category-1'],
        name: { 'zh-TW': '拿鐵' },
        price: 120,
        tagIds: ['tag-missing'],
      }),
    ).rejects.toBeInstanceOf(BadRequestError);

    expect(mocks.productRepository.create).not.toHaveBeenCalled();
  });

  it('allows uncategorized products and ignores category or metadata active filters', async () => {
    const service = createProductService();
    const created = productEntity({
      categoryIds: [],
      allergenIds: ['allergen-inactive'],
      dietaryMarkerIds: ['dietary-marker-inactive'],
    });

    mocks.allergenRepository.list.mockResolvedValue([
      { id: 'allergen-inactive' },
    ]);
    mocks.dietaryMarkerRepository.list.mockResolvedValue([
      { id: 'dietary-marker-inactive' },
    ]);
    mocks.productRepository.create.mockResolvedValue(created);

    await expect(
      service.createProduct('store-1', 'org-1', {
        name: { 'zh-TW': '拿鐵' },
        price: 120,
        allergenIds: ['allergen-inactive'],
        dietaryMarkerIds: ['dietary-marker-inactive'],
      }),
    ).resolves.toMatchObject({
      categoryIds: [],
      allergenIds: ['allergen-inactive'],
      dietaryMarkerIds: ['dietary-marker-inactive'],
    });

    expect(mocks.categoryRepository.listByStore).not.toHaveBeenCalled();
    expect(mocks.allergenRepository.list).toHaveBeenCalledWith({});
    expect(mocks.dietaryMarkerRepository.list).toHaveBeenCalledWith({});
    expect(mocks.productRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ categoryIds: [] }),
    );
  });

  it('updates product fields with a stale-write guard', async () => {
    const service = createProductService();
    const now = new Date('2026-06-05T08:00:00.000Z');

    mocks.productRepository.findById.mockResolvedValue(
      productEntity({ updatedAt: now }),
    );
    mocks.categoryRepository.listByStore.mockResolvedValue([
      { id: 'category-2' },
    ]);
    mocks.productRepository.update.mockResolvedValue(
      productEntity({
        categoryIds: ['category-2'],
        price: 135,
        updatedAt: new Date('2026-06-05T08:01:00.000Z'),
      }),
    );

    await expect(
      service.updateProduct('store-1', 'product-1', {
        categoryIds: ['category-2'],
        price: 135,
      }),
    ).resolves.toMatchObject({
      id: 'product-1',
      categoryIds: ['category-2'],
      price: 135,
    });

    expect(mocks.productRepository.update).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({
        categoryIds: ['category-2'],
        price: 135,
      }),
      { expectedUpdatedAt: now },
    );
    expect(mocks.categoryRepository.listByStore).toHaveBeenCalledWith({
      storeId: 'store-1',
      isActive: true,
    });
  });

  it('returns conflict when product changes before toggle write', async () => {
    const service = createProductService();

    mocks.productRepository.findById.mockResolvedValue(productEntity());
    mocks.productRepository.update.mockResolvedValue(null);

    await expect(
      service.toggleProductSoldOut('store-1', 'product-1', {
        isSoldOut: true,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
