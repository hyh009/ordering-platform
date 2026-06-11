import { apiJson } from '@/api';
import { publicPaths } from '@/api/paths/public.paths';
import { orderModel } from '@/models/order';
import type {
  AddOrderBatchRequest,
  AddOrderBatchSuccessResponse,
  GetGuestOrderSuccessResponse,
} from '@/models/order';

const publicOptions = { skipRefresh: true, skipRevalidate: true } as const;

function guestInit(guestToken: string, init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: { Authorization: `Bearer ${guestToken}` },
  };
}

export const guestOrderService = {
  async getOrder(guestToken: string) {
    const response = await apiJson<GetGuestOrderSuccessResponse>(
      publicPaths.guestOrder(),
      guestInit(guestToken),
      publicOptions,
    );

    return orderModel.deserialize(response.data.order);
  },

  async addBatch(guestToken: string, request: AddOrderBatchRequest) {
    const response = await apiJson<AddOrderBatchSuccessResponse>(
      publicPaths.guestOrderBatches(),
      guestInit(guestToken, {
        method: 'POST',
        body: JSON.stringify(request),
      }),
      publicOptions,
    );

    return orderModel.deserialize(response.data.order);
  },
};
