import { describe, expect, it } from 'vitest';

import { CartMongoModel } from '../src/models/cart/mongo.js';
import {
  buildDailyOrderCounterId,
  type CounterEntity,
} from '../src/models/counter/model.js';
import { CounterMongoModel } from '../src/models/counter/mongo.js';
import { OrderMongoModel } from '../src/models/order/mongo.js';

describe('ordering runtime Mongo models', () => {
  it('builds daily per-store counter ids', () => {
    expect(buildDailyOrderCounterId('store-1', '2026-05-16')).toBe(
      'order_daily_sequence:store-1:2026-05-16',
    );
  });

  it('accepts a daily order counter', () => {
    const counter = new CounterMongoModel({
      _id: buildDailyOrderCounterId('store-1', '2026-05-16'),
      scope: 'order_daily_sequence',
      storeId: 'store-1',
      businessDate: '2026-05-16',
      sequence: 23,
    } satisfies Partial<CounterEntity>);

    expect(counter.validateSync()).toBeUndefined();
    expect(counter._id).toBe('order_daily_sequence:store-1:2026-05-16');
  });

  it('accepts a dine-in active cart with embedded participant snapshots', () => {
    const cart = new CartMongoModel({
      id: 'cart-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      orderType: 'dine_in',
      checkoutMode: 'pay_later',
      tableNumber: 'A1',
      participants: [
        {
          id: 'participant-1',
          displayName: 'Hsinyi',
        },
      ],
      items: [
        {
          id: 'cart-item-1',
          productId: 'product-1',
          productName: {
            en: 'Latte',
          },
          quantity: 2,
          unitPrice: 120,
          selectedOptions: [
            {
              modifierId: 'modifier-1',
              modifierName: {
                en: 'Milk',
              },
              optionId: 'option-1',
              optionName: {
                en: 'Oat milk',
              },
              priceAdjustment: 15,
            },
          ],
          addedByParticipantId: 'participant-1',
          participantDisplayName: 'Hsinyi',
          totalItemPrice: 270,
        },
      ],
      subtotal: 270,
      serviceFeeRate: 0.1,
      serviceFeeAmount: 27,
      totalAmount: 297,
    });

    expect(cart.validateSync()).toBeUndefined();
    expect(cart.status).toBe('active');
    expect(cart.participants[0]?.joinedAt).toBeInstanceOf(Date);
    expect(cart.items[0]?.createdAt).toBeInstanceOf(Date);
  });

  it('accepts an order with daily display number and batches', () => {
    const order = new OrderMongoModel({
      id: 'order-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      cartId: 'cart-1',
      orderType: 'takeaway',
      checkoutMode: 'pay_first',
      businessDate: '2026-05-16',
      dailySequence: 23,
      displayNumber: 'A023',
      status: 'pending_confirmation',
      paymentStatus: 'unpaid',
      participants: [
        {
          id: 'participant-1',
          displayName: 'Hsinyi',
        },
      ],
      items: [
        {
          id: 'order-item-1',
          productId: 'product-1',
          productName: {
            en: 'Latte',
          },
          quantity: 1,
          unitPrice: 120,
          selectedOptions: [],
          totalItemPrice: 120,
        },
      ],
      batches: [
        {
          id: 'batch-1',
          batchNumber: 1,
          status: 'pending_confirmation',
          submittedByParticipantId: 'participant-1',
          items: [
            {
              id: 'order-item-1',
              productId: 'product-1',
              productName: {
                en: 'Latte',
              },
              quantity: 1,
              unitPrice: 120,
              selectedOptions: [],
              totalItemPrice: 120,
            },
          ],
          subtotal: 120,
        },
      ],
      subtotal: 120,
      serviceFeeRate: 0,
      serviceFeeAmount: 0,
      totalAmount: 120,
    });

    expect(order.validateSync()).toBeUndefined();
    expect(order.batches[0]?.submittedAt).toBeInstanceOf(Date);
  });

  it('accepts manual payment, service, and completion timestamps', () => {
    const paidAt = new Date('2026-05-16T12:30:00.000Z');
    const servedAt = new Date('2026-05-16T12:40:00.000Z');
    const completedAt = new Date('2026-05-16T12:45:00.000Z');
    const order = new OrderMongoModel({
      id: 'order-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      orderType: 'dine_in',
      checkoutMode: 'pay_later',
      businessDate: '2026-05-16',
      dailySequence: 23,
      displayNumber: 'A023',
      status: 'completed',
      paymentStatus: 'paid',
      paidAt,
      servedAt,
      completedAt,
    });

    expect(order.validateSync()).toBeUndefined();
    expect(order.paidAt).toEqual(paidAt);
    expect(order.servedAt).toEqual(servedAt);
    expect(order.completedAt).toEqual(completedAt);
  });

  it('accepts a served unpaid pay-later order', () => {
    const servedAt = new Date('2026-05-16T12:40:00.000Z');
    const order = new OrderMongoModel({
      id: 'order-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      orderType: 'dine_in',
      checkoutMode: 'pay_later',
      businessDate: '2026-05-16',
      dailySequence: 23,
      displayNumber: 'A023',
      status: 'served',
      paymentStatus: 'unpaid',
      servedAt,
    });

    expect(order.validateSync()).toBeUndefined();
    expect(order.servedAt).toEqual(servedAt);
  });

  it('validates order batch status', () => {
    const order = new OrderMongoModel({
      id: 'order-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      orderType: 'dine_in',
      checkoutMode: 'pay_later',
      businessDate: '2026-05-16',
      dailySequence: 23,
      displayNumber: 'A023',
      status: 'pending_confirmation',
      paymentStatus: 'unpaid',
      batches: [
        {
          id: 'batch-1',
          batchNumber: 1,
          status: 'unknown',
          subtotal: 0,
        },
      ],
    });

    expect(order.validateSync()?.errors['batches.0.status']?.message).toContain(
      '`unknown` is not a valid enum value',
    );
  });

  it('validates order status and daily sequence', () => {
    const order = new OrderMongoModel({
      id: 'order-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      orderType: 'takeaway',
      checkoutMode: 'pay_first',
      businessDate: '2026-05-16',
      dailySequence: 0,
      displayNumber: 'A000',
      status: 'unknown',
      paymentStatus: 'unpaid',
    });

    const errors = order.validateSync()?.errors;

    expect(errors?.dailySequence?.message).toContain(
      'Path `dailySequence` (0) is less than minimum allowed value (1)',
    );
    expect(errors?.status?.message).toContain(
      '`unknown` is not a valid enum value',
    );
  });

  it('validates cart item quantity and service fee rate', () => {
    const cart = new CartMongoModel({
      id: 'cart-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      orderType: 'dine_in',
      checkoutMode: 'pay_later',
      serviceFeeRate: 1.5,
      items: [
        {
          id: 'cart-item-1',
          productId: 'product-1',
          productName: {
            en: 'Latte',
          },
          quantity: 0,
          unitPrice: 120,
          selectedOptions: [],
          totalItemPrice: 0,
        },
      ],
    });

    const errors = cart.validateSync()?.errors;

    expect(errors?.serviceFeeRate?.message).toContain(
      'Path `serviceFeeRate` (1.5) is more than maximum allowed value (1)',
    );
    expect(errors?.['items.0.quantity']?.message).toContain(
      'Path `quantity` (0) is less than minimum allowed value (1)',
    );
  });

  it('requires displayable localized names in cart item snapshots', () => {
    const cart = new CartMongoModel({
      id: 'cart-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      orderType: 'dine_in',
      checkoutMode: 'pay_later',
      items: [
        {
          id: 'cart-item-1',
          productId: 'product-1',
          productName: {
            en: '   ',
          },
          quantity: 1,
          unitPrice: 120,
          selectedOptions: [
            {
              modifierId: 'modifier-1',
              modifierName: {},
              optionId: 'option-1',
              optionName: {
                'zh-TW': '',
              },
              priceAdjustment: 0,
            },
          ],
          totalItemPrice: 120,
        },
      ],
    });

    const errors = cart.validateSync()?.errors;

    expect(errors?.['items.0.productName']?.message).toBe(
      'productName must have at least one localized value',
    );
    expect(errors?.['items.0.selectedOptions.0.modifierName']?.message).toBe(
      'modifierName must have at least one localized value',
    );
    expect(errors?.['items.0.selectedOptions.0.optionName']?.message).toBe(
      'optionName must have at least one localized value',
    );
  });

  it('requires displayable localized names in order item snapshots', () => {
    const order = new OrderMongoModel({
      id: 'order-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      orderType: 'takeaway',
      checkoutMode: 'pay_first',
      businessDate: '2026-05-16',
      dailySequence: 1,
      displayNumber: 'A001',
      status: 'pending_confirmation',
      paymentStatus: 'unpaid',
      items: [
        {
          id: 'order-item-1',
          productId: 'product-1',
          productName: {},
          quantity: 1,
          unitPrice: 120,
          selectedOptions: [],
          totalItemPrice: 120,
        },
      ],
    });

    expect(order.validateSync()?.errors['items.0.productName']?.message).toBe(
      'productName must have at least one localized value',
    );
  });
});
