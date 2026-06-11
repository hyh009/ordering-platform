import { apiJson } from '@/api';
import { publicPaths } from '@/api/paths/public.paths';
import { guestMenuModel } from '@/models/guestMenu';
import type {
  GetPublicMenuSuccessResponse,
  GetPublicStoreSuccessResponse,
} from '@/models/guestMenu';

const publicOptions = { skipRefresh: true, skipRevalidate: true } as const;

export const guestMenuService = {
  async getStore(storeId: string) {
    const response = await apiJson<GetPublicStoreSuccessResponse>(
      publicPaths.store(storeId),
      undefined,
      publicOptions,
    );

    return guestMenuModel.deserializeStore(response.data.store);
  },

  async getMenu(storeId: string) {
    const response = await apiJson<GetPublicMenuSuccessResponse>(
      publicPaths.menu(storeId),
      undefined,
      publicOptions,
    );

    return guestMenuModel.deserializeMenu(response.data.menu);
  },
};
