import { createProductModifierService } from '@src/services/productModifier.service';
import { ConflictError } from '@src/utils/errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const repository = {
    findById: vi.fn(),
    update: vi.fn(),
  };

  return { repository };
});

vi.mock('@src/repositories/productModifier/repository', () => ({
  productModifierRepository: mocks.repository,
}));

describe('product modifier service', () => {
  beforeEach(() => {
    mocks.repository.findById.mockReset();
    mocks.repository.update.mockReset();
  });

  it('accepts a valid next selection state assembled from the stored record', async () => {
    const service = createProductModifierService();
    const now = new Date('2026-06-03T08:00:00.000Z');

    mocks.repository.findById.mockResolvedValue({
      id: 'product-modifier-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      name: { 'zh-TW': '尺寸' },
      selectionType: 'multiple_choice',
      minSelect: 0,
      maxSelect: 1,
      displayOrder: 0,
      options: [],
      inheritCategoryAvailability: true,
      availabilityRules: [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    mocks.repository.update.mockResolvedValue({
      id: 'product-modifier-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      name: { 'zh-TW': '尺寸' },
      selectionType: 'single_choice',
      minSelect: 0,
      maxSelect: 1,
      displayOrder: 0,
      options: [],
      inheritCategoryAvailability: true,
      availabilityRules: [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await expect(
      service.updateProductModifier('store-1', 'product-modifier-1', {
        selectionType: 'single_choice',
      }),
    ).resolves.toMatchObject({
      id: 'product-modifier-1',
      selectionType: 'single_choice',
      maxSelect: 1,
    });

    expect(mocks.repository.update).toHaveBeenCalledWith(
      'product-modifier-1',
      expect.objectContaining({ selectionType: 'single_choice' }),
      { expectedUpdatedAt: now },
    );
  });

  it('rejects an invalid next selection state before writing', async () => {
    const service = createProductModifierService();
    const now = new Date('2026-06-03T08:00:00.000Z');

    mocks.repository.findById.mockResolvedValue({
      id: 'product-modifier-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      name: { 'zh-TW': '尺寸' },
      selectionType: 'multiple_choice',
      minSelect: 0,
      maxSelect: 2,
      displayOrder: 0,
      options: [],
      inheritCategoryAvailability: true,
      availabilityRules: [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await expect(
      service.updateProductModifier('store-1', 'product-modifier-1', {
        selectionType: 'single_choice',
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(mocks.repository.update).not.toHaveBeenCalled();
  });

  it('returns conflict when the record changes between validation and update', async () => {
    const service = createProductModifierService();
    const now = new Date('2026-06-03T08:00:00.000Z');

    mocks.repository.findById.mockResolvedValue({
      id: 'product-modifier-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      name: { 'zh-TW': '加料' },
      selectionType: 'multiple_choice',
      minSelect: 0,
      maxSelect: 2,
      displayOrder: 0,
      options: [],
      inheritCategoryAvailability: true,
      availabilityRules: [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    mocks.repository.update.mockResolvedValue(null);

    await expect(
      service.updateProductModifier('store-1', 'product-modifier-1', {
        maxSelect: 3,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
