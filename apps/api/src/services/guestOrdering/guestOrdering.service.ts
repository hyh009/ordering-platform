import * as data from './guestOrdering.data.service';
import * as sse from './guestOrdering.sse.service';

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

export type { CreateCartResult } from './guestOrdering.data.service';

/**
 * Public join result returned to routes. The data layer's `cartId` (used only as
 * the SSE channel key) is stripped here.
 */
export type JoinCartResult = {
  session: GuestSessionDto;
  guestToken: string;
};

/**
 * Orchestration layer for guest ordering — the only surface routes import. Each
 * mutation runs the data service, then emits the matching event to connected
 * SSE streams. Pure reads delegate straight through. SSE concerns live entirely
 * in `guestOrdering.sse.service`; persistence lives entirely in
 * `guestOrdering.data.service`.
 */

// ── Store-open helper (re-exported for middleware) ───────────────────────────────

export { requireStoreOpen } from './guestOrdering.data.service';

// ── Reads ────────────────────────────────────────────────────────────────────────

export function getGuestSession(
  claims: GuestTokenClaims,
): Promise<GuestSessionDto> {
  return data.getGuestSession(claims);
}

export function getGuestCart(claims: GuestTokenClaims) {
  return data.getGuestCart(claims);
}

export function getGuestOrder(claims: GuestTokenClaims): Promise<OrderDto> {
  return data.getGuestOrder(claims);
}

// ── Cart lifecycle ─────────────────────────────────────────────────────────────

export function createCart(storeId: string, request: CreateCartRequest) {
  // A freshly created cart has no other participants connected yet, so there is
  // nothing to fan out.
  return data.createCart(storeId, request);
}

export async function joinCart(
  storeId: string,
  request: JoinCartRequest,
): Promise<JoinCartResult> {
  const { cartId, ...result } = await data.joinCart(storeId, request);

  // A new participant changes the shared cart and/or the open order; push
  // whichever the join touched so devices already in the session see them join.
  if (result.session.cart) {
    sse.emitCartUpdated(cartId, result.session.cart);
  }
  if (result.session.order) {
    sse.emitOrderUpdated(cartId, result.session.order);
  }

  return result;
}

export async function addCartItem(
  claims: GuestTokenClaims,
  request: CartItemInput,
) {
  const cart = await data.addCartItem(claims, request);
  sse.emitCartUpdated(claims.cartId, cart);
  return cart;
}

export async function updateCartItem(
  claims: GuestTokenClaims,
  itemId: string,
  request: UpdateCartItemRequest,
) {
  const cart = await data.updateCartItem(claims, itemId, request);
  sse.emitCartUpdated(claims.cartId, cart);
  return cart;
}

export async function removeCartItem(
  claims: GuestTokenClaims,
  itemId: string,
) {
  const cart = await data.removeCartItem(claims, itemId);
  sse.emitCartUpdated(claims.cartId, cart);
  return cart;
}

export async function leaveCart(claims: GuestTokenClaims): Promise<string> {
  const cart = await data.leaveCart(claims);
  // Remaining participants see the leaver and their items removed. The route
  // contract only needs the cart id.
  sse.emitCartUpdated(claims.cartId, cart);
  return cart.id;
}

export async function submitCart(
  claims: GuestTokenClaims,
  request: SubmitCartRequest,
): Promise<OrderDto> {
  const { order, cart } = await data.submitCart(claims, request);

  // The submitted round always changes the order; it also drains the draft cart
  // unless this was a double-submit no-op (`cart` null).
  sse.emitOrderUpdated(claims.cartId, order);
  if (cart) {
    sse.emitCartUpdated(claims.cartId, cart);
  }

  return order;
}

// ── Live session stream ──────────────────────────────────────────────────────────

export type GuestSessionStream = {
  /** Frames to push immediately on connect: the current cart and/or order. */
  initial: GuestStreamEventDto[];
  /** Attach a listener for ongoing session events; returns its unsubscribe. */
  subscribe: (listener: (event: GuestStreamEventDto) => void) => () => void;
};

/**
 * Resolve the guest session for streaming: build the initial snapshot frames
 * (cart and/or order) and hand back a `subscribe` for ongoing changes. Throws
 * when the token resolves to neither a usable cart nor an order, so the route
 * can fail with a JSON error before it opens the event stream.
 */
export async function openGuestSessionStream(
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
