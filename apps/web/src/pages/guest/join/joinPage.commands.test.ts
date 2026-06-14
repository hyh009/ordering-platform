import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGuestRuntime } from '@/features/guest/runtime';
import type { PublicStore } from '@/models/guestMenu';
import { guestMenuService } from '@/services/guestMenu.service';
import { createJoinPageCommands } from './joinPage.commands';

vi.mock('@/services/guestMenu.service', () => ({
  guestMenuService: {
    getMenu: vi.fn(),
    getStore: vi.fn(),
  },
}));

describe('join page commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads store details without loading the menu during initialization', async () => {
    const runtime = createGuestRuntime();
    const loadedStore = { id: 'store-a' } as PublicStore;
    vi.mocked(guestMenuService.getStore).mockResolvedValue(loadedStore);

    await expect(
      createJoinPageCommands(runtime).initialize('store-a'),
    ).resolves.toEqual({ status: 'loaded' });

    expect(guestMenuService.getStore).toHaveBeenCalledWith('store-a');
    expect(guestMenuService.getMenu).not.toHaveBeenCalled();
    expect(runtime.stores.storefront.getState().store).toBe(loadedStore);
  });
});
