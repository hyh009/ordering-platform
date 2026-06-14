import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicMenu, PublicStore } from '@/models/guestMenu';
import { guestMenuService } from '@/services/guestMenu.service';
import { createGuestStorefrontActions } from './actions';
import { createGuestStorefrontCommands } from './commands';
import { createGuestStorefrontStore } from './store';
import { createGuestTenantStore } from '../tenant/store';

vi.mock('@/services/guestMenu.service', () => ({
  guestMenuService: {
    getMenu: vi.fn(),
    getStore: vi.fn(),
  },
}));

describe('guest storefront commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads only store data and preserves an existing menu', async () => {
    const storefrontStore = createGuestStorefrontStore();
    const tenantStore = createGuestTenantStore();
    const existingMenu = { categories: [] } as unknown as PublicMenu;
    const loadedStore = { id: 'store-a' } as PublicStore;
    storefrontStore.setState({ menu: existingMenu });
    tenantStore.setState({ activeStoreId: 'store-a' });
    vi.mocked(guestMenuService.getStore).mockResolvedValue(loadedStore);
    const commands = createGuestStorefrontCommands({
      actions: createGuestStorefrontActions(storefrontStore),
      tenantStore,
    });

    await expect(commands.loadStore('store-a')).resolves.toEqual({
      status: 'loaded',
    });
    expect(guestMenuService.getStore).toHaveBeenCalledWith('store-a');
    expect(guestMenuService.getMenu).not.toHaveBeenCalled();
    expect(storefrontStore.getState()).toMatchObject({
      store: loadedStore,
      menu: existingMenu,
      isLoading: false,
      error: null,
    });
  });
});
