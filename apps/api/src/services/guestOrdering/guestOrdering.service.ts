import * as data from '@src/modules/guestOrdering/guestOrdering.data.service';
import * as sse from '@src/modules/guestOrdering/guestOrdering.sse.service';

import type {
  CartItemInput,
  CreateCartRequest,
  GuestSessionDto,
  GuestStreamEventDto,
  JoinCartRequest,
  OrderDto,
  SubmitCartRequest,
  UpdateCartItemRequest,
} from '@repo/shared';
import type { GuestTokenClaims } from '@src/services/guestToken.service';

export type { CreateCartResult } from '@src/modules/guestOrdering/guestOrdering.data.service';

/**
 * Public join result returned to routes. The data layer's `cartId` (used only as
 * the SSE channel key) is stripped here.
 */
export type JoinCartResult = {
  session: GuestSessionDto;
  guestToken: string;
};

/**
 * API-facing guest ordering use-case layer. Routes, middleware, and other
 * services import this public surface; lower-level data and realtime
 * capabilities remain inside `modules/guestOrdering`.
 */
export class GuestOrderingService {
  public requireStoreOpen(...args: Parameters<typeof data.requireStoreOpen>) {
    return data.requireStoreOpen(...args);
  }

  // Reads
  public getGuestSession(claims: GuestTokenClaims): Promise<GuestSessionDto> {
    return data.getGuestSession(claims);
  }

  public getGuestCart(claims: GuestTokenClaims) {
    return data.getGuestCart(claims);
  }

  public getGuestOrder(claims: GuestTokenClaims): Promise<OrderDto> {
    return data.getGuestOrder(claims);
  }

  // Cart lifecycle
  public createCart(storeId: string, request: CreateCartRequest) {
    // A freshly created cart has no other participants connected yet, so there
    // is nothing to fan out.
    return data.createCart(storeId, request);
  }

  public async joinCart(
    storeId: string,
    request: JoinCartRequest,
  ): Promise<JoinCartResult> {
    const { cartId, ...result } = await data.joinCart(storeId, request);

    // A new participant changes the shared cart and/or the open order; push
    // whichever the join touched so devices already in the session see them
    // join.
    if (result.session.cart) {
      sse.emitCartUpdated(cartId, result.session.cart);
    }
    if (result.session.order) {
      sse.emitOrderUpdated(cartId, result.session.order);
    }

    return result;
  }

  public async addCartItem(claims: GuestTokenClaims, request: CartItemInput) {
    const cart = await data.addCartItem(claims, request);
    sse.emitCartUpdated(claims.cartId, cart);
    return cart;
  }

  public async updateCartItem(
    claims: GuestTokenClaims,
    itemId: string,
    request: UpdateCartItemRequest,
  ) {
    const cart = await data.updateCartItem(claims, itemId, request);
    sse.emitCartUpdated(claims.cartId, cart);
    return cart;
  }

  public async removeCartItem(claims: GuestTokenClaims, itemId: string) {
    const cart = await data.removeCartItem(claims, itemId);
    sse.emitCartUpdated(claims.cartId, cart);
    return cart;
  }

  public async leaveCart(claims: GuestTokenClaims): Promise<string> {
    const cart = await data.leaveCart(claims);
    // Remaining participants see the leaver and their items removed. The route
    // contract only needs the cart id.
    sse.emitCartUpdated(claims.cartId, cart);
    return cart.id;
  }

  public async submitCart(
    claims: GuestTokenClaims,
    request: SubmitCartRequest,
  ): Promise<OrderDto> {
    const { order, cart } = await data.submitCart(claims, request);

    // The submitted round always changes the order; it also drains the draft
    // cart unless this was a double-submit no-op (`cart` null).
    sse.emitOrderUpdated(claims.cartId, order);
    if (cart) {
      sse.emitCartUpdated(claims.cartId, cart);
    }

    return order;
  }

  // Realtime notifications exposed to cross-domain services
  public notifyOrderUpdated(cartId: string, order: OrderDto): void {
    sse.emitOrderUpdated(cartId, order);
  }

  /**
   * Resolve the guest session for streaming: build the initial snapshot frames
   * (cart and/or order) and hand back a `subscribe` for ongoing changes. Throws
   * when the token resolves to neither a usable cart nor an order, so the route
   * can fail with a JSON error before it opens the event stream.
   */
  public async openGuestSessionStream(
    claims: GuestTokenClaims,
  ): Promise<GuestSessionStream> {
    const session = await data.getGuestSession(claims);

    const initial: GuestStreamEventDto[] = [];
    if (session.cart) {
      initial.push({ type: 'cart_updated', cart: session.cart });
    }
    if (session.order) {
      initial.push({ type: 'order_updated', order: session.order });
    }

    return {
      initial,
      subscribe: (listener) => sse.subscribeToSession(claims.cartId, listener),
    };
  }
}

export type GuestSessionStream = {
  /** Frames to push immediately on connect: the current cart and/or order. */
  initial: GuestStreamEventDto[];
  /** Attach a listener for ongoing session events; returns its unsubscribe. */
  subscribe: (listener: (event: GuestStreamEventDto) => void) => () => void;
};

export function createGuestOrderingService() {
  return new GuestOrderingService();
}

export const guestOrderingService = createGuestOrderingService();
