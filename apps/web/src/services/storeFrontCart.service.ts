import { apiJson } from '@/api';
import { storeFrontApiJson } from '@/api/storeFrontApiJson';
import { publicPaths } from '@/api/paths/public.paths';
import { cartModel } from '@/models/cart';
import type {
  AddCartItemRequest,
  CreateCartRequest,
  CreateCartSuccessResponse,
  GetGuestCartSuccessResponse,
  GetGuestSessionSuccessResponse,
  JoinCartRequest,
  JoinCartSuccessResponse,
  LeaveCartSuccessResponse,
  MutateGuestCartSuccessResponse,
  SubmitCartRequest,
  SubmitCartSuccessResponse,
  UpdateCartItemRequest,
} from '@/models/cart';
import { orderModel } from '@/models/order';

const publicOptions = { skipRefresh: true, skipRevalidate: true } as const;

export const storeFrontCartService = {
  async createCart(storeId: string, request: CreateCartRequest) {
    const response = await apiJson<CreateCartSuccessResponse>(
      publicPaths.carts(storeId),
      { method: 'POST', body: JSON.stringify(request) },
      publicOptions,
    );

    return {
      cart: cartModel.deserialize(response.data.cart),
      participantId: response.data.participantId,
      guestToken: response.data.guestToken,
    };
  },

  async joinCart(storeId: string, request: JoinCartRequest) {
    const response = await apiJson<JoinCartSuccessResponse>(
      publicPaths.cartsJoin(storeId),
      { method: 'POST', body: JSON.stringify(request) },
      publicOptions,
    );

    return {
      session: cartModel.deserializeSession(response.data.session),
      guestToken: response.data.guestToken,
    };
  },

  async getSession(guestToken: string) {
    const response = await storeFrontApiJson<GetGuestSessionSuccessResponse>(
      publicPaths.guestSession(),
      guestToken,
    );

    return cartModel.deserializeSession(response.data.session);
  },

  async getCart(guestToken: string) {
    const response = await storeFrontApiJson<GetGuestCartSuccessResponse>(
      publicPaths.storeFrontCart(),
      guestToken,
    );

    return cartModel.deserialize(response.data.cart);
  },

  async addItem(guestToken: string, request: AddCartItemRequest) {
    const response = await storeFrontApiJson<MutateGuestCartSuccessResponse>(
      publicPaths.storeFrontCartItems(),
      guestToken,
      { method: 'POST', body: JSON.stringify(request) },
    );

    return cartModel.deserialize(response.data.cart);
  },

  async updateItem(
    guestToken: string,
    itemId: string,
    request: UpdateCartItemRequest,
  ) {
    const response = await storeFrontApiJson<MutateGuestCartSuccessResponse>(
      publicPaths.storeFrontCartItemDetail(itemId),
      guestToken,
      { method: 'PATCH', body: JSON.stringify(request) },
    );

    return cartModel.deserialize(response.data.cart);
  },

  async removeItem(guestToken: string, itemId: string) {
    const response = await storeFrontApiJson<MutateGuestCartSuccessResponse>(
      publicPaths.storeFrontCartItemDetail(itemId),
      guestToken,
      { method: 'DELETE' },
    );

    return cartModel.deserialize(response.data.cart);
  },

  async leaveCart(guestToken: string) {
    const response = await storeFrontApiJson<LeaveCartSuccessResponse>(
      publicPaths.storeFrontCartLeave(),
      guestToken,
      { method: 'POST' },
    );

    return response.data.leftCartId;
  },

  async submitCart(guestToken: string, request: SubmitCartRequest) {
    const response = await storeFrontApiJson<SubmitCartSuccessResponse>(
      publicPaths.storeFrontCartSubmit(),
      guestToken,
      { method: 'POST', body: JSON.stringify(request) },
    );

    return orderModel.deserialize(response.data.order);
  },
};
