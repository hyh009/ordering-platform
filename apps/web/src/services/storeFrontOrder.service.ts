import { storeFrontApiJson } from '@/api/storeFrontApiJson';
import { publicPaths } from '@/api/paths/public.paths';
import { orderModel } from '@/models/order';
import type {
  AddOrderBatchRequest,
  AddOrderBatchSuccessResponse,
  GetGuestOrderSuccessResponse,
} from '@/models/order';

export const storeFrontOrderService = {
  async getOrder(guestToken: string) {
    const response = await storeFrontApiJson<GetGuestOrderSuccessResponse>(
      publicPaths.storeFrontOrder(),
      guestToken,
    );

    return orderModel.deserialize(response.data.order);
  },

  async addBatch(guestToken: string, request: AddOrderBatchRequest) {
    const response = await storeFrontApiJson<AddOrderBatchSuccessResponse>(
      publicPaths.storeFrontOrderBatches(),
      guestToken,
      { method: 'POST', body: JSON.stringify(request) },
    );

    return orderModel.deserialize(response.data.order);
  },
};
