import { describe, expect, it, vi } from 'vitest';

import { toStoreDto } from '../src/models/store/mapper.js';

import type { StoreEntity } from '../src/models/store/model.js';

const AT = new Date('2026-10-01T03:00:00.000Z');

const updateMock = vi.hoisted(() => vi.fn());
const findByIdMock = vi.hoisted(() => vi.fn());

vi.mock('../src/repositories/store/repository.js', () => ({
  storeRepository: {
    findById: findByIdMock,
    update: updateMock,
  },
}));

function storeEntity(overrides: Partial<StoreEntity> = {}): StoreEntity {
  return {
    id: 'store-1',
    organizationId: 'org-1',
    profile: { displayName: { en: 'Corner Cafe' } },
    locale: { defaultLocale: 'en', supportedLocales: ['en'] },
    operation: { businessHours: [], serviceFeeRate: 0, orderModes: [] },
    status: 'active',
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  } as StoreEntity;
}

describe('store assistant setting', () => {
  it('is absent from the DTO on a store that never configured the assistant', () => {
    // Absent and false are different answers: the merchant form shows "never
    // configured" rather than claiming the merchant turned it off.
    expect(toStoreDto(storeEntity())).not.toHaveProperty('assistant');
  });

  it('is exposed on the DTO once configured', () => {
    expect(
      toStoreDto(
        storeEntity({ assistant: { autoApplyCartOperations: true } }),
      ).assistant,
    ).toEqual({ autoApplyCartOperations: true });
  });

  it('round-trips through the update path', async () => {
    const { storeService } = await import('../src/services/store.service.js');

    findByIdMock.mockResolvedValue(storeEntity());
    updateMock.mockResolvedValue(
      storeEntity({ assistant: { autoApplyCartOperations: true } }),
    );

    const updated = await storeService.updateStore('store-1', 'org-1', {
      assistant: { autoApplyCartOperations: true },
    });

    expect(updateMock).toHaveBeenCalledWith('store-1', {
      assistant: { autoApplyCartOperations: true },
    });
    expect(updated.assistant).toEqual({ autoApplyCartOperations: true });
  });

  it('leaves the assistant block alone when the update does not mention it', async () => {
    const { storeService } = await import('../src/services/store.service.js');

    findByIdMock.mockResolvedValue(storeEntity());
    updateMock.mockResolvedValue(storeEntity({ status: 'disabled' }));

    await storeService.updateStore('store-1', 'org-1', { status: 'disabled' });

    // A partial update must not reset a setting it never named.
    expect(updateMock).toHaveBeenCalledWith('store-1', { status: 'disabled' });
  });
});
