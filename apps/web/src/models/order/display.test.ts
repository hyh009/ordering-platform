import { describe, expect, it } from 'vitest';
import { getParticipantAmount } from './display';
import type { Order } from './types';

const order = {
  id: 'order-1',
  storeId: 'store-1',
  orderType: 'dine_in',
  checkoutMode: 'pay_later',
  businessDate: '2026-06-16',
  displayNumber: '001',
  status: 'pending_confirmation',
  paymentStatus: 'unpaid',
  canAddOn: true,
  participants: [],
  items: [],
  batches: [],
  participantAmounts: [
    {
      participantId: 'participant-1',
      itemSubtotal: 1200,
      serviceFeeAmount: 120,
      totalAmount: 1320,
    },
    {
      participantId: 'participant-2',
      itemSubtotal: 800,
      serviceFeeAmount: 80,
      totalAmount: 880,
    },
  ],
  subtotal: 2000,
  serviceFeeRate: 0.1,
  serviceFeeAmount: 200,
  totalAmount: 2200,
  orderingClosesAt: '2026-06-16T13:00:00.000Z',
  createdAt: '2026-06-16T01:00:00.000Z',
  updatedAt: '2026-06-16T01:00:00.000Z',
} satisfies Order;

describe('order display helpers', () => {
  it('returns the amount breakdown for a known participant id', () => {
    expect(getParticipantAmount(order, 'participant-2')).toEqual({
      participantId: 'participant-2',
      itemSubtotal: 800,
      serviceFeeAmount: 80,
      totalAmount: 880,
    });
  });

  it('returns undefined for an unknown participant id', () => {
    expect(getParticipantAmount(order, 'participant-unknown')).toBeUndefined();
  });
});
