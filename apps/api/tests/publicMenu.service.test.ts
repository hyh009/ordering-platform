import { getPublicMenu } from '@src/services/publicStore.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  storeRepository: { findById: vi.fn() },
  productRepository: { listByStore: vi.fn() },
  categoryRepository: { listByStore: vi.fn() },
  productModifierRepository: { listByStore: vi.fn() },
  tagRepository: { listByStore: vi.fn() },
  allergenRepository: { list: vi.fn() },
  dietaryMarkerRepository: { list: vi.fn() },
}));

vi.mock('@src/repositories/store/repository', () => ({
  storeRepository: mocks.storeRepository,
}));
vi.mock('@src/repositories/product/repository', () => ({
  productRepository: mocks.productRepository,
}));
vi.mock('@src/repositories/category/repository', () => ({
  categoryRepository: mocks.categoryRepository,
}));
vi.mock('@src/repositories/productModifier/repository', () => ({
  productModifierRepository: mocks.productModifierRepository,
}));
vi.mock('@src/repositories/tag/repository', () => ({
  tagRepository: mocks.tagRepository,
}));
vi.mock('@src/repositories/allergen/repository', () => ({
  allergenRepository: mocks.allergenRepository,
}));
vi.mock('@src/repositories/dietaryMarker/repository', () => ({
  dietaryMarkerRepository: mocks.dietaryMarkerRepository,
}));

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: 'product-1',
    categoryIds: [] as string[],
    name: { 'zh-TW': '品項' },
    imageUrls: [],
    price: 30,
    tagIds: [],
    allergenIds: [],
    dietaryMarkerIds: [],
    modifierIds: [],
    status: 'published',
    isActive: true,
    isSoldOut: false,
    ...overrides,
  };
}

function category(overrides: Record<string, unknown> = {}) {
  return {
    id: 'category-1',
    name: { 'zh-TW': '分類' },
    displayOrder: 0,
    productOrder: [] as string[],
    availabilityRules: [],
    ...overrides,
  };
}

describe('getPublicMenu grouping', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((repo) =>
      Object.values(repo).forEach((fn) => fn.mockReset()),
    );
    mocks.storeRepository.findById.mockResolvedValue({ status: 'active' });
    mocks.productModifierRepository.listByStore.mockResolvedValue([]);
    mocks.tagRepository.listByStore.mockResolvedValue([]);
    mocks.allergenRepository.list.mockResolvedValue([]);
    mocks.dietaryMarkerRepository.list.mockResolvedValue([]);
  });

  it('groups published products per category (productOrder-sorted), drops empty categories, buckets uncategorized last', async () => {
    mocks.categoryRepository.listByStore.mockResolvedValue([
      category({
        id: 'egg',
        displayOrder: 0,
        productOrder: ['p-pork', 'p-plain'],
      }),
      category({ id: 'toast', displayOrder: 1 }),
      category({ id: 'empty', displayOrder: 2 }),
    ]);
    mocks.productRepository.listByStore.mockResolvedValue([
      product({ id: 'p-plain', categoryIds: ['egg'] }),
      product({ id: 'p-pork', categoryIds: ['egg'] }),
      product({ id: 'p-ham', categoryIds: ['toast'] }),
      product({ id: 'p-loose', categoryIds: [] }),
      product({ id: 'p-draft', categoryIds: ['egg'], status: 'draft' }),
    ]);

    const menu = await getPublicMenu('store-1');

    expect(
      menu.groups.map((group) => ({
        categoryId: group.category?.id ?? null,
        productIds: group.products.map((p) => p.id),
      })),
    ).toEqual([
      { categoryId: 'egg', productIds: ['p-pork', 'p-plain'] },
      { categoryId: 'toast', productIds: ['p-ham'] },
      { categoryId: null, productIds: ['p-loose'] },
    ]);
  });
});
