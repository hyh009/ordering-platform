import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addCartItem,
  leaveCart,
  openGuestSessionStream,
  submitCart,
} from '../src/services/guestOrdering/index.js';

import type { GuestTokenClaims } from '../src/services/guestToken.service.js';
import type { CartDto, GuestStreamEventDto, OrderDto } from '@repo/shared';

/**
 * Verifies the orchestrator's emit mapping and the snapshot-driven session
 * stream through the real eventBus + sse service, with only the data service
 * mocked. Each mutation must publish the right event type(s) to the session
 * channel keyed by cartId.
 */
const dataMocks = {
  getGuestSession: vi.fn(),
  addCartItem: vi.fn(),
  leaveCart: vi.fn(),
  submitCart: vi.fn(),
  requireStoreOpen: vi.fn(),
};

vi.mock('../src/services/guestOrdering/guestOrdering.data.service.js', () => ({
  getGuestSession: (...args: unknown[]) => dataMocks.getGuestSession(...args),
  addCartItem: (...args: unknown[]) => dataMocks.addCartItem(...args),
  leaveCart: (...args: unknown[]) => dataMocks.leaveCart(...args),
  submitCart: (...args: unknown[]) => dataMocks.submitCart(...args),
  requireStoreOpen: (...args: unknown[]) =>
    dataMocks.requireStoreOpen(...args),
}));

const CART_ID = 'cart-1';
const claims: GuestTokenClaims = {
  storeId: 'store-1',
  cartId: CART_ID,
  participantId: 'participant-1',
};

const fakeCart = { id: CART_ID, items: [] } as unknown as CartDto;
const fakeOrder = { id: 'order-1' } as unknown as OrderDto;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('guest session stream', () => {
  it('pushes the active cart as the initial snapshot', async () => {
    dataMocks.getGuestSession.mockResolvedValue({
      participantId: claims.participantId,
      cart: fakeCart,
    });

    const { initial } = await openGuestSessionStream(claims);

    expect(initial).toEqual([{ type: 'cart_updated', cart: fakeCart }]);
  });

  it('pushes both cart and order when a round has been submitted', async () => {
    dataMocks.getGuestSession.mockResolvedValue({
      participantId: claims.participantId,
      cart: fakeCart,
      order: fakeOrder,
    });

    const { initial } = await openGuestSessionStream(claims);

    expect(initial).toEqual([
      { type: 'cart_updated', cart: fakeCart },
      { type: 'order_updated', order: fakeOrder },
    ]);
  });

  it('forwards a cart_updated event when an item is added', async () => {
    dataMocks.getGuestSession.mockResolvedValue({
      participantId: claims.participantId,
      cart: fakeCart,
    });
    dataMocks.addCartItem.mockResolvedValue(fakeCart);

    const events: GuestStreamEventDto[] = [];
    const { subscribe } = await openGuestSessionStream(claims);
    const unsubscribe = subscribe((event) => events.push(event));

    await addCartItem(claims, { productId: 'product-1', quantity: 1 });

    expect(events).toContainEqual({ type: 'cart_updated', cart: fakeCart });
    unsubscribe();
  });

  it('forwards both order_updated and cart_updated on submit', async () => {
    dataMocks.getGuestSession.mockResolvedValue({
      participantId: claims.participantId,
      cart: fakeCart,
    });
    dataMocks.submitCart.mockResolvedValue({ order: fakeOrder, cart: fakeCart });

    const events: GuestStreamEventDto[] = [];
    const { subscribe } = await openGuestSessionStream(claims);
    const unsubscribe = subscribe((event) => events.push(event));

    await submitCart(claims, {});

    expect(events).toContainEqual({ type: 'order_updated', order: fakeOrder });
    expect(events).toContainEqual({ type: 'cart_updated', cart: fakeCart });
    unsubscribe();
  });

  it('stops forwarding after unsubscribe', async () => {
    dataMocks.getGuestSession.mockResolvedValue({
      participantId: claims.participantId,
      cart: fakeCart,
    });
    dataMocks.leaveCart.mockResolvedValue(fakeCart);

    const events: GuestStreamEventDto[] = [];
    const { subscribe } = await openGuestSessionStream(claims);
    const unsubscribe = subscribe((event) => events.push(event));
    unsubscribe();

    await leaveCart(claims);

    expect(events).toHaveLength(0);
  });
});
