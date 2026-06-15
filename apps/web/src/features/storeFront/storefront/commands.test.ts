import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicMenu, PublicStore } from '@/models/storeFrontMenu';
import { storeFrontMenuService } from '@/services/storeFrontMenu.service';
import { createStorefrontActions } from './actions';
import { createStorefrontCommands } from './commands';
import { createStorefrontStore } from './store';
import { createTenantStore } from '../tenant/store';

vi.mock('@/services/storeFrontMenu.service', () => ({
  storeFrontMenuService: {
    getMenu: vi.fn(),
    getStore: vi.fn(),
  },
}));

describe('storefront commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads only store data and preserves an existing menu', async () => {
    const storefrontStore = createStorefrontStore();
    const tenantStore = createTenantStore();
    const existingMenu = { categories: [] } as unknown as PublicMenu;
    const loadedStore = { id: 'store-a' } as PublicStore;
    storefrontStore.setState({ menu: existingMenu });
    tenantStore.setState({ activeStoreId: 'store-a' });
    vi.mocked(storeFrontMenuService.getStore).mockResolvedValue(loadedStore);
    const commands = createStorefrontCommands({
      actions: createStorefrontActions(storefrontStore),
      tenantStore,
    });

    await expect(commands.loadStore('store-a')).resolves.toEqual({
      status: 'loaded',
    });
    expect(storeFrontMenuService.getStore).toHaveBeenCalledWith('store-a');
    expect(storeFrontMenuService.getMenu).not.toHaveBeenCalled();
    expect(storefrontStore.getState()).toMatchObject({
      store: loadedStore,
      menu: existingMenu,
      isLoading: false,
      error: null,
    });
  });
});
