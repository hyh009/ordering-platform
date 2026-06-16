import { describe, expect, it } from 'vitest';

import type { CartDto, GuestSessionDto } from '@repo/shared';
import { cartModel } from './model';

function cartDto(overrides: Partial<CartDto> = {}): CartDto {
  return {
    id: 'cart-1',
    storeId: 'store-1',
    orderType: 'dine_in',
    checkoutMode: 'pay_later',
    status: 'active',
    participants: [
      {
        id: 'participant-1',
        avatarKey: 'rainbow_cat',
        joinedAt: '2026-06-16T01:00:00.000Z',
      },
    ],
    items: [],
    subtotal: 0,
    serviceFeeRate: 0,
    serviceFeeAmount: 0,
    totalAmount: 0,
    expiresAt: '2026-06-16T13:00:00.000Z',
    createdAt: '2026-06-16T01:00:00.000Z',
    updatedAt: '2026-06-16T01:00:00.000Z',
    ...overrides,
  };
}

describe('cartModel', () => {
  it('preserves Phase 2 cart fields', () => {
    const cart = cartModel.deserialize(
      cartDto({ orderingClosesAt: '2026-06-16T03:00:00.000Z' }),
    );

    expect(cart.expiresAt).toBe('2026-06-16T13:00:00.000Z');
    expect(cart.orderingClosesAt).toBe('2026-06-16T03:00:00.000Z');
    expect(cart.participants[0]?.avatarKey).toBe('rainbow_cat');
  });

  it('preserves the optional guest-session join code', () => {
    const dto = {
      participantId: 'participant-1',
      joinCode: 'ABC123',
      cart: cartDto(),
    } satisfies GuestSessionDto;

    expect(cartModel.deserializeSession(dto).joinCode).toBe('ABC123');
  });
});
