import { apiJson } from '@/api';
import { merchantStorePaths } from '@/api/paths/store.paths';
import { storeModel } from '@/models/store';

import type { GetStoreSuccessResponse, ListStoresSuccessResponse } from '@repo/shared';
import type { Store } from '@/models/store';

export const storeService = {
  async getStore(storeId: string): Promise<Store> {
    const response = await apiJson<GetStoreSuccessResponse>(
      merchantStorePaths.detail(storeId),
    );

    return storeModel.deserialize(response.data.store);
  },

  async listStores(organizationId: string, options: { offset?: number; limit?: number } = {}): Promise<{ stores: Store[]; total: number }> {
    const params = new URLSearchParams({ organizationId });

    if (options.offset !== undefined) params.set('offset', String(options.offset));
    if (options.limit !== undefined) params.set('limit', String(options.limit));

    const response = await apiJson<ListStoresSuccessResponse>(
      `${merchantStorePaths.list}?${params.toString()}`,
    );

    return {
      stores: response.data.stores.map(storeModel.deserialize),
      total: response.data.pagination.total,
    };
  },
};
