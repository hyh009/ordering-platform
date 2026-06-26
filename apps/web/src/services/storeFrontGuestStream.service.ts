import { apiUrl } from '@/api';
import { publicPaths } from '@/api/paths/public.paths';
import { cartModel } from '@/models/cart';
import { orderModel } from '@/models/order';
import { connectSse } from '@/shared/sse';
import type { Cart } from '@/models/cart';
import type { GuestStreamEventDto, Order } from '@/models/order';

type GuestStreamHandlers = {
  onCartUpdated: (cart: Cart) => void;
  onOrderUpdated: (order: Order) => void;
};

/**
 * Subscribes to the guest session SSE stream and hands back deserialized
 * domain models. Raw DTOs never leave this service: each frame is parsed and
 * converted through the cart/order models before the handlers see it. The
 * server pushes a snapshot on connect and on every change, so reconnects
 * resync automatically.
 */
export const storeFrontGuestStreamService = {
  subscribeGuestStream(guestToken: string, handlers: GuestStreamHandlers) {
    const url = apiUrl(publicPaths.storeFrontGuestStream());

    return connectSse(url, {
      headers: { Authorization: `Bearer ${guestToken}` },
      onEvent: (event) => {
        const parsed = JSON.parse(event.data) as GuestStreamEventDto;

        if (parsed.type === 'cart_updated') {
          handlers.onCartUpdated(cartModel.deserialize(parsed.cart));
          return;
        }

        if (parsed.type === 'order_updated') {
          handlers.onOrderUpdated(orderModel.deserialize(parsed.order));
        }
      },
    });
  },
};
