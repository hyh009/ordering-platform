import { publish, subscribe } from '@src/realtime/eventBus';

import type { CartDto, GuestStreamEventDto, OrderDto } from '@repo/shared';

/**
 * Streaming layer for guest ordering. Owns the `GuestStreamEventDto` shape and
 * fans cart/order changes to connected SSE streams over the generic event bus.
 * It knows nothing about persistence — the orchestrator calls these after a
 * data mutation commits.
 *
 * One channel spans a whole guest session, keyed by the stable session cart id
 * (`claims.cartId`). Every participant of a cart shares that id, and an order is
 * always linked to its cart, so both `cart_updated` and `order_updated` fan out
 * on the same channel and reach every device in the session.
 */
const CHANNEL_PREFIX = 'guest_session:';

function sessionChannel(cartId: string): string {
  return `${CHANNEL_PREFIX}${cartId}`;
}

export function emitCartUpdated(cartId: string, cart: CartDto): void {
  publish<GuestStreamEventDto>(sessionChannel(cartId), {
    type: 'cart_updated',
    cart,
  });
}

export function emitOrderUpdated(cartId: string, order: OrderDto): void {
  publish<GuestStreamEventDto>(sessionChannel(cartId), {
    type: 'order_updated',
    order,
  });
}

export function subscribeToSession(
  cartId: string,
  listener: (event: GuestStreamEventDto) => void,
): () => void {
  return subscribe<GuestStreamEventDto>(sessionChannel(cartId), listener);
}
