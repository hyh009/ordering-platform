import { apiJson } from '@/api';
import { publicPaths } from '@/api/paths/public.paths';
import { storeFrontMenuModel } from '@/models/storeFrontMenu';
import type {
  GetPublicMenuSuccessResponse,
  GetPublicStoreSuccessResponse,
} from '@/models/storeFrontMenu';

const publicOptions = { skipRefresh: true, skipRevalidate: true } as const;

export const storeFrontMenuService = {
  async getStore(storeId: string) {
    const response = await apiJson<GetPublicStoreSuccessResponse>(
      publicPaths.store(storeId),
      undefined,
      publicOptions,
    );

    return storeFrontMenuModel.deserializeStore(response.data.store);
  },

  async getMenu(storeId: string) {
    const response = await apiJson<GetPublicMenuSuccessResponse>(
      publicPaths.menu(storeId),
      undefined,
      publicOptions,
    );

    return storeFrontMenuModel.deserializeMenu(response.data.menu);
  },
};
