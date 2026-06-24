import { describe, expect, it } from 'vitest';

import { toOrderDto } from '../src/models/order/mapper.js';
import { allocateServiceFee } from '../src/models/order/model.js';

import type { OrderBatchSnapshot, OrderEntity } from '../src/models/order/model.js';
import type {
  CartItemSnapshot,
  OrderingParticipantSnapshot,
} from '../src/models/cart/model.js';

function makeParticipant(
  id: string,
  overrides: Partial<OrderingParticipantSnapshot> = {},
): OrderingParticipantSnapshot {
  return {
    id,
    avatarKey: 'bear',
    joinedAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeItem(
  id: string,
  totalItemPrice: number,
  overrides: Partial<CartItemSnapshot> = {},
): CartItemSnapshot {
  return {
    id,
    productId: `product-${id}`,
    productName: { en: `Product ${id}` },
    quantity: 1,
    unitPrice: totalItemPrice,
    selectedOptions: [],
    totalItemPrice,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeBatch(
  id: string,
  items: CartItemSnapshot[],
  overrides: Partial<OrderBatchSnapshot> = {},
): OrderBatchSnapshot {
  return {
    id,
    batchNumber: 1,
    status: 'preparing',
    submittedAt: new Date('2026-06-01T00:00:00.000Z'),
    items,
    subtotal: items.reduce((sum, item) => sum + item.totalItemPrice, 0),
    ...overrides,
  };
}

function makeOrder(overrides: Partial<OrderEntity> = {}): OrderEntity {
  const batches = overrides.batches ?? [];
  const participants = overrides.participants ?? [];
  const items = batches.flatMap((batch) => batch.items);
  const subtotal =
    overrides.subtotal ??
    items.reduce((sum, item) => sum + item.totalItemPrice, 0);
  const serviceFeeAmount = overrides.serviceFeeAmount ?? 0;

  return {
    id: 'order-1',
    organizationId: 'org-1',
    storeId: 'store-1',
    orderType: 'dine_in',
    checkoutMode: 'pay_later',
    businessDate: '2026-06-01',
    dailySequence: 1,
    displayNumber: 'A001',
    status: 'preparing',
    paymentStatus: 'unpaid',
    participants,
    items,
    batches,
    subtotal,
    serviceFeeRate: 0.1,
    serviceFeeAmount,
    totalAmount: subtotal + serviceFeeAmount,
    orderingClosesAt: new Date('2026-06-01T02:00:00.000Z'),
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('allocateServiceFee', () => {
  it('returns zero for everyone when total weight is zero', () => {
    const result = allocateServiceFee(
      [
        { participantId: 'a', weight: 0 },
        { participantId: 'b', weight: 0 },
      ],
      100,
    );

    expect(result).toEqual([
      { participantId: 'a', amount: 0 },
      { participantId: 'b', amount: 0 },
    ]);
  });

  it('returns zero for everyone when the fee is zero', () => {
    const result = allocateServiceFee(
      [
        { participantId: 'a', weight: 50 },
        { participantId: 'b', weight: 50 },
      ],
      0,
    );

    expect(result).toEqual([
      { participantId: 'a', amount: 0 },
      { participantId: 'b', amount: 0 },
    ]);
  });

  it('splits proportionally on a clean-divides case', () => {
    const result = allocateServiceFee(
      [
        { participantId: 'a', weight: 75 },
        { participantId: 'b', weight: 25 },
      ],
      100,
    );

    expect(result).toEqual([
      { participantId: 'a', amount: 75 },
      { participantId: 'b', amount: 25 },
    ]);
  });

  it('gives the whole fee to a single participant', () => {
    const result = allocateServiceFee([{ participantId: 'a', weight: 40 }], 17);

    expect(result).toEqual([{ participantId: 'a', amount: 17 }]);
  });

  it('distributes leftover dollars to the largest fractions', () => {
    // Three equal weights, fee 10 -> rawShare 3.333 each, base 3 each,
    // leftover 1 goes to the largest fraction (all equal -> earliest index).
    const result = allocateServiceFee(
      [
        { participantId: 'a', weight: 1 },
        { participantId: 'b', weight: 1 },
        { participantId: 'c', weight: 1 },
      ],
      10,
    );

    expect(result).toEqual([
      { participantId: 'a', amount: 4 },
      { participantId: 'b', amount: 3 },
      { participantId: 'c', amount: 3 },
    ]);
    expect(result.reduce((sum, r) => sum + r.amount, 0)).toBe(10);
  });

  it('routes leftover to the participant with the largest remainder', () => {
    // weights 1 and 2, total 3, fee 10 ->
    // a: 3.333 base 3 frac .333; b: 6.666 base 6 frac .666; leftover 1 -> b.
    const result = allocateServiceFee(
      [
        { participantId: 'a', weight: 1 },
        { participantId: 'b', weight: 2 },
      ],
      10,
    );

    expect(result).toEqual([
      { participantId: 'a', amount: 3 },
      { participantId: 'b', amount: 7 },
    ]);
  });

  it('breaks fraction ties by earlier input index', () => {
    // weights 1,1,1,1 with fee 6 -> rawShare 1.5 each, base 1, leftover 2 ->
    // the two earliest indices win the tie.
    const result = allocateServiceFee(
      [
        { participantId: 'a', weight: 1 },
        { participantId: 'b', weight: 1 },
        { participantId: 'c', weight: 1 },
        { participantId: 'd', weight: 1 },
      ],
      6,
    );

    expect(result).toEqual([
      { participantId: 'a', amount: 2 },
      { participantId: 'b', amount: 2 },
      { participantId: 'c', amount: 1 },
      { participantId: 'd', amount: 1 },
    ]);
  });

  it('preserves input order in the returned array', () => {
    const result = allocateServiceFee(
      [
        { participantId: 'z', weight: 1 },
        { participantId: 'y', weight: 2 },
        { participantId: 'x', weight: 1 },
      ],
      8,
    );

    expect(result.map((r) => r.participantId)).toEqual(['z', 'y', 'x']);
  });
});

describe('toOrderDto participantAmounts', () => {
  it('reconciles per-participant amounts to the order totals', () => {
    const order = makeOrder({
      participants: [makeParticipant('p1'), makeParticipant('p2')],
      batches: [
        makeBatch(
          'b1',
          [
            makeItem('i1', 70, { addedByParticipantId: 'p1' }),
            makeItem('i2', 30, { addedByParticipantId: 'p2' }),
          ],
          { submittedByParticipantId: 'p1' },
        ),
      ],
      serviceFeeAmount: 7,
    });

    const dto = toOrderDto(order);
    const amounts = dto.participantAmounts;

    expect(amounts.reduce((sum, a) => sum + a.itemSubtotal, 0)).toBe(
      order.subtotal,
    );
    expect(amounts.reduce((sum, a) => sum + a.serviceFeeAmount, 0)).toBe(
      order.serviceFeeAmount,
    );
    expect(amounts.reduce((sum, a) => sum + a.totalAmount, 0)).toBe(
      order.totalAmount,
    );
  });

  it('splits the fee proportionally to item subtotals', () => {
    const order = makeOrder({
      participants: [makeParticipant('p1'), makeParticipant('p2')],
      batches: [
        makeBatch('b1', [
          makeItem('i1', 80, { addedByParticipantId: 'p1' }),
          makeItem('i2', 20, { addedByParticipantId: 'p2' }),
        ]),
      ],
      serviceFeeAmount: 10,
    });

    const amounts = toOrderDto(order).participantAmounts;

    expect(amounts).toEqual([
      {
        participantId: 'p1',
        itemSubtotal: 80,
        serviceFeeAmount: 8,
        totalAmount: 88,
      },
      {
        participantId: 'p2',
        itemSubtotal: 20,
        serviceFeeAmount: 2,
        totalAmount: 22,
      },
    ]);
  });

  it('falls back to the batch submitter when item owner is undefined', () => {
    const order = makeOrder({
      participants: [makeParticipant('p1'), makeParticipant('p2')],
      batches: [
        makeBatch('b1', [makeItem('i1', 50)], {
          submittedByParticipantId: 'p2',
        }),
      ],
      serviceFeeAmount: 5,
    });

    const amounts = toOrderDto(order).participantAmounts;

    expect(amounts).toEqual([
      {
        participantId: 'p1',
        itemSubtotal: 0,
        serviceFeeAmount: 0,
        totalAmount: 0,
      },
      {
        participantId: 'p2',
        itemSubtotal: 50,
        serviceFeeAmount: 5,
        totalAmount: 55,
      },
    ]);
  });

  it('uses the submitter when the resolved owner is not a participant', () => {
    const order = makeOrder({
      participants: [makeParticipant('p1'), makeParticipant('p2')],
      batches: [
        makeBatch(
          'b1',
          [makeItem('i1', 40, { addedByParticipantId: 'ghost' })],
          { submittedByParticipantId: 'p2' },
        ),
      ],
      serviceFeeAmount: 4,
    });

    const amounts = toOrderDto(order).participantAmounts;

    expect(amounts).toEqual([
      {
        participantId: 'p1',
        itemSubtotal: 0,
        serviceFeeAmount: 0,
        totalAmount: 0,
      },
      {
        participantId: 'p2',
        itemSubtotal: 40,
        serviceFeeAmount: 4,
        totalAmount: 44,
      },
    ]);
  });

  it('falls back to the first participant when owner and submitter are absent', () => {
    const order = makeOrder({
      participants: [makeParticipant('p1'), makeParticipant('p2')],
      batches: [
        // No submittedByParticipantId set, so the batch has no submitter.
        makeBatch('b1', [
          makeItem('i1', 60, { addedByParticipantId: 'ghost' }),
        ]),
      ],
      serviceFeeAmount: 6,
    });

    const amounts = toOrderDto(order).participantAmounts;

    // owner 'ghost' is not a participant and there is no submitter, so the item
    // value is attributed to the first participant as a last resort, keeping
    // itemSubtotals reconciled to order.subtotal.
    expect(amounts).toEqual([
      {
        participantId: 'p1',
        itemSubtotal: 60,
        serviceFeeAmount: 6,
        totalAmount: 66,
      },
      {
        participantId: 'p2',
        itemSubtotal: 0,
        serviceFeeAmount: 0,
        totalAmount: 0,
      },
    ]);
  });

  it('includes participants with no items as all zero', () => {
    const order = makeOrder({
      participants: [makeParticipant('p1'), makeParticipant('p2')],
      batches: [
        makeBatch('b1', [makeItem('i1', 100, { addedByParticipantId: 'p1' })]),
      ],
      serviceFeeAmount: 10,
    });

    const amounts = toOrderDto(order).participantAmounts;

    expect(amounts).toContainEqual({
      participantId: 'p2',
      itemSubtotal: 0,
      serviceFeeAmount: 0,
      totalAmount: 0,
    });
  });
});
