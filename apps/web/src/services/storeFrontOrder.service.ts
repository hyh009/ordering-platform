import { storeFrontApiJson } from '@/api/storeFrontApiJson';
import { publicPaths } from '@/api/paths/public.paths';
import { orderModel } from '@/models/order';
import type { GetGuestOrderSuccessResponse } from '@/models/order';

export const storeFrontOrderService = {
  async getOrder(guestToken: string) {
    const response = await storeFrontApiJson<GetGuestOrderSuccessResponse>(
      publicPaths.storeFrontOrder(),
      guestToken,
    );

    return orderModel.deserialize(response.data.order);
  },
};
