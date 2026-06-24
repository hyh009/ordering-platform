import { describe, expect, it } from 'vitest';

import type { OrderDto } from '@repo/shared';
import { orderModel } from './model';

describe('orderModel', () => {
  it('preserves Phase 2 order fields', () => {
    const dto = {
      id: 'order-1',
      storeId: 'store-1',
      orderType: 'dine_in',
      checkoutMode: 'pay_later',
      businessDate: '2026-06-16',
      displayNumber: '001',
      status: 'pending_confirmation',
      paymentStatus: 'unpaid',
      canAddOn: true,
      participants: [
        {
          id: 'participant-1',
          avatarKey: 'owl',
          joinedAt: '2026-06-16T01:00:00.000Z',
        },
      ],
      items: [],
      batches: [],
      participantAmounts: [
        {
          participantId: 'participant-1',
          itemSubtotal: 0,
          serviceFeeAmount: 0,
          totalAmount: 0,
        },
      ],
      subtotal: 0,
      serviceFeeRate: 0,
      serviceFeeAmount: 0,
      totalAmount: 0,
      orderingClosesAt: '2026-06-16T13:00:00.000Z',
      createdAt: '2026-06-16T01:00:00.000Z',
      updatedAt: '2026-06-16T01:00:00.000Z',
    } satisfies OrderDto;

    const order = orderModel.deserialize(dto);

    expect(order.orderingClosesAt).toBe('2026-06-16T13:00:00.000Z');
    expect(order.canAddOn).toBe(true);
    expect(order.participants[0]?.avatarKey).toBe('owl');
  });

  it('preserves the participant amount breakdowns', () => {
    const dto = {
      id: 'order-1',
      storeId: 'store-1',
      orderType: 'dine_in',
      checkoutMode: 'pay_later',
      businessDate: '2026-06-16',
      displayNumber: '001',
      status: 'pending_confirmation',
      paymentStatus: 'unpaid',
      canAddOn: true,
      participants: [
        {
          id: 'participant-1',
          avatarKey: 'owl',
          joinedAt: '2026-06-16T01:00:00.000Z',
        },
      ],
      items: [],
      batches: [],
      participantAmounts: [
        {
          participantId: 'participant-1',
          itemSubtotal: 1200,
          serviceFeeAmount: 120,
          totalAmount: 1320,
        },
      ],
      subtotal: 1200,
      serviceFeeRate: 0.1,
      serviceFeeAmount: 120,
      totalAmount: 1320,
      orderingClosesAt: '2026-06-16T13:00:00.000Z',
      createdAt: '2026-06-16T01:00:00.000Z',
      updatedAt: '2026-06-16T01:00:00.000Z',
    } satisfies OrderDto;

    const order = orderModel.deserialize(dto);

    expect(order.participantAmounts).toEqual(dto.participantAmounts);
  });
});
