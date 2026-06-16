import { apiJson } from '@/api';
import { merchantStorePaths } from '@/api/paths/store.paths';
import { assetModel } from '@/models/asset';
import { storeModel } from '@/models/store';

import type {
  GetStoreSuccessResponse,
  ListStoresSuccessResponse,
  UpdateStoreSuccessResponse,
  UploadImageSuccessResponse,
} from '@repo/shared';
import type { StoreImageKind, UploadedImage } from '@/models/asset';
import type { Store, StoreListItem, UpdateStoreRequest } from '@/models/store';

export const storeService = {
  async getStore(storeId: string): Promise<Store> {
    const response = await apiJson<GetStoreSuccessResponse>(
      merchantStorePaths.detail(storeId),
    );

    return storeModel.deserialize(response.data.store);
  },

  async listStores(organizationId: string, options: { offset?: number; limit?: number } = {}): Promise<{ stores: StoreListItem[]; total: number }> {
    const params = new URLSearchParams({ organizationId });

    if (options.offset !== undefined) params.set('offset', String(options.offset));
    if (options.limit !== undefined) params.set('limit', String(options.limit));

    const response = await apiJson<ListStoresSuccessResponse>(
      `${merchantStorePaths.list}?${params.toString()}`,
    );

    return {
      stores: response.data.stores,
      total: response.data.pagination.total,
    };
  },

  async updateStore(storeId: string, input: UpdateStoreRequest): Promise<Store> {
    const response = await apiJson<UpdateStoreSuccessResponse>(
      merchantStorePaths.detail(storeId),
      {
        body: JSON.stringify(input),
        method: 'PATCH',
      },
    );

    return storeModel.deserialize(response.data.store);
  },

  async uploadStoreImage(
    storeId: string,
    kind: StoreImageKind,
    file: File,
  ): Promise<UploadedImage> {
    const formData = new FormData();
    // multer reads the text `kind` field before the binary `file` field, so
    // append in that order.
    formData.append('kind', kind);
    formData.append('file', file);

    const response = await apiJson<UploadImageSuccessResponse>(
      merchantStorePaths.images(storeId),
      {
        body: formData,
        method: 'POST',
      },
    );

    return assetModel.deserialize(response.data.image);
  },
};
