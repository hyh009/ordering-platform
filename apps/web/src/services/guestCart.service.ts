import { apiJson } from '@/api';
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

// Guest endpoints authenticate with the guest token, never the merchant
// session; skip the merchant 401-refresh/403-revalidate handling.
const publicOptions = { skipRefresh: true, skipRevalidate: true } as const;

function guestInit(guestToken: string, init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: { Authorization: `Bearer ${guestToken}` },
  };
}

export const guestCartService = {
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
    const response = await apiJson<GetGuestSessionSuccessResponse>(
      publicPaths.guestSession(),
      guestInit(guestToken),
      publicOptions,
    );

    return cartModel.deserializeSession(response.data.session);
  },

  async getCart(guestToken: string) {
    const response = await apiJson<GetGuestCartSuccessResponse>(
      publicPaths.guestCart(),
      guestInit(guestToken),
      publicOptions,
    );

    return cartModel.deserialize(response.data.cart);
  },

  async addItem(guestToken: string, request: AddCartItemRequest) {
    const response = await apiJson<MutateGuestCartSuccessResponse>(
      publicPaths.guestCartItems(),
      guestInit(guestToken, {
        method: 'POST',
        body: JSON.stringify(request),
      }),
      publicOptions,
    );

    return cartModel.deserialize(response.data.cart);
  },

  async updateItem(
    guestToken: string,
    itemId: string,
    request: UpdateCartItemRequest,
  ) {
    const response = await apiJson<MutateGuestCartSuccessResponse>(
      publicPaths.guestCartItemDetail(itemId),
      guestInit(guestToken, {
        method: 'PATCH',
        body: JSON.stringify(request),
      }),
      publicOptions,
    );

    return cartModel.deserialize(response.data.cart);
  },

  async removeItem(guestToken: string, itemId: string) {
    const response = await apiJson<MutateGuestCartSuccessResponse>(
      publicPaths.guestCartItemDetail(itemId),
      guestInit(guestToken, { method: 'DELETE' }),
      publicOptions,
    );

    return cartModel.deserialize(response.data.cart);
  },

  async leaveCart(guestToken: string) {
    const response = await apiJson<LeaveCartSuccessResponse>(
      publicPaths.guestCartLeave(),
      guestInit(guestToken, { method: 'POST' }),
      publicOptions,
    );

    return response.data.leftCartId;
  },

  async submitCart(guestToken: string, request: SubmitCartRequest) {
    const response = await apiJson<SubmitCartSuccessResponse>(
      publicPaths.guestCartSubmit(),
      guestInit(guestToken, {
        method: 'POST',
        body: JSON.stringify(request),
      }),
      publicOptions,
    );

    return orderModel.deserialize(response.data.order);
  },
};
