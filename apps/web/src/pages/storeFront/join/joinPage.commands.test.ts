import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStoreFrontRuntime } from '@/features/storeFront/runtime';
import type { PublicStore } from '@/models/storeFrontMenu';
import { storeFrontMenuService } from '@/services/storeFrontMenu.service';
import { createJoinPageCommands } from './joinPage.commands';

vi.mock('@/services/storeFrontMenu.service', () => ({
  storeFrontMenuService: {
    getMenu: vi.fn(),
    getStore: vi.fn(),
  },
}));

describe('join page commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads store details without loading the menu during initialization', async () => {
    const runtime = createStoreFrontRuntime();
    const loadedStore = { id: 'store-a' } as PublicStore;
    vi.mocked(storeFrontMenuService.getStore).mockResolvedValue(loadedStore);

    await expect(
      createJoinPageCommands(runtime).initialize('store-a'),
    ).resolves.toEqual({ status: 'loaded' });

    expect(storeFrontMenuService.getStore).toHaveBeenCalledWith('store-a');
    expect(storeFrontMenuService.getMenu).not.toHaveBeenCalled();
    expect(runtime.stores.storefront.getState().store).toBe(loadedStore);
  });
});
