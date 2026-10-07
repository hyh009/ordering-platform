import { describe, expect, it } from 'vitest';

import {
  cartItemQuantityChange,
  countProductQuantity,
  exceedsProductQuantityLimit,
  MAX_PRODUCT_QUANTITY,
} from './productQuantityLimit';

const items = [
  { id: 'line-1', productId: 'tea', quantity: 3 },
  { id: 'line-2', productId: 'tea', quantity: 90 },
  { id: 'line-3', productId: 'cake', quantity: 2 },
];

describe('the per-product quantity limit', () => {
  it('is 99', () => {
    expect(MAX_PRODUCT_QUANTITY).toBe(99);
  });

  it('counts one product across every line, whatever the options', () => {
    expect(countProductQuantity(items, 'tea')).toBe(93);
    expect(countProductQuantity(items, 'cake')).toBe(2);
    expect(countProductQuantity(items, 'not-in-cart')).toBe(0);
  });

  it('allows a change that lands exactly on the limit', () => {
    expect(
      exceedsProductQuantityLimit(items, [{ productId: 'tea', delta: 6 }]),
    ).toBe(false);
  });

  it('refuses a change that goes one past it', () => {
    expect(
      exceedsProductQuantityLimit(items, [{ productId: 'tea', delta: 7 }]),
    ).toBe(true);
  });

  it('counts each product on its own', () => {
    expect(
      exceedsProductQuantityLimit(items, [{ productId: 'cake', delta: 97 }]),
    ).toBe(false);
    expect(
      exceedsProductQuantityLimit(items, [{ productId: 'cake', delta: 98 }]),
    ).toBe(true);
  });

  it('nets several changes to one product before judging them', () => {
    expect(
      exceedsProductQuantityLimit(items, [
        { productId: 'tea', delta: 10 },
        { productId: 'tea', delta: -4 },
      ]),
    ).toBe(false);
    expect(
      exceedsProductQuantityLimit(items, [
        { productId: 'tea', delta: 4 },
        { productId: 'tea', delta: 3 },
      ]),
    ).toBe(true);
  });

  it('never refuses a decrease or a no-op, even in a cart already over', () => {
    const over = [{ id: 'line-1', productId: 'tea', quantity: 120 }];

    expect(
      exceedsProductQuantityLimit(over, [{ productId: 'tea', delta: -1 }]),
    ).toBe(false);
    expect(
      exceedsProductQuantityLimit(over, [{ productId: 'tea', delta: 0 }]),
    ).toBe(false);
    expect(
      exceedsProductQuantityLimit(over, [{ productId: 'tea', delta: 1 }]),
    ).toBe(true);
  });

  it('turns a line edit into the change it makes to the product', () => {
    expect(cartItemQuantityChange(items, 'line-1', 9)).toEqual([
      { productId: 'tea', delta: 6 },
    ]);
    expect(cartItemQuantityChange(items, 'line-1', 1)).toEqual([
      { productId: 'tea', delta: -2 },
    ]);
  });

  it('reports no change for an edit that leaves the quantity alone or misses', () => {
    expect(cartItemQuantityChange(items, 'line-1', undefined)).toEqual([]);
    expect(cartItemQuantityChange(items, 'gone', 5)).toEqual([]);
  });
});
