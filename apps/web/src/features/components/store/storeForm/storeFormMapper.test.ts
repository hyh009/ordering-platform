import { describe, expect, it } from 'vitest';

import { fromStore, toUpdateStoreRequest } from './storeFormMapper';

import type { Store } from '@/models/store';

const AT = '2026-10-01T03:00:00.000Z';

function store(assistant?: { autoApplyCartOperations: boolean }): Store {
  return {
    id: 'store-1',
    organizationId: 'org-1',
    profile: { displayName: { en: 'Corner Cafe' } },
    locale: { defaultLocale: 'en', supportedLocales: ['en'] },
    operation: { businessHours: [], serviceFeeRate: 0, orderModes: [] },
    status: 'active',
    createdAt: AT,
    updatedAt: AT,
    ...(assistant ? { assistant } : {}),
  } as Store;
}

describe('store form assistant setting', () => {
  it('reads as off on a store that never configured the assistant', () => {
    expect(fromStore(store()).autoApplyCartOperations).toBe(false);
  });

  it('reads the configured value back', () => {
    expect(
      fromStore(store({ autoApplyCartOperations: true }))
        .autoApplyCartOperations,
    ).toBe(true);
  });

  it('patches the assistant block only when the toggle moved', () => {
    const original = fromStore(store());
    const current = { ...original, autoApplyCartOperations: true };

    expect(toUpdateStoreRequest(original, current)).toEqual({
      assistant: { autoApplyCartOperations: true },
    });
  });

  it('leaves the assistant block out when nothing changed', () => {
    const values = fromStore(store({ autoApplyCartOperations: true }));

    // A patch that resends an unchanged setting is a patch that can clobber a
    // concurrent change.
    expect(toUpdateStoreRequest(values, values)).not.toHaveProperty(
      'assistant',
    );
  });

  it('patches turning the setting back off', () => {
    const original = fromStore(store({ autoApplyCartOperations: true }));
    const current = { ...original, autoApplyCartOperations: false };

    expect(toUpdateStoreRequest(original, current)).toEqual({
      assistant: { autoApplyCartOperations: false },
    });
  });
});
