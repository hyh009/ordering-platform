import { describe, expect, it } from 'vitest';

import { sortProductsByCategoryOrder } from '../src/models/product/order.js';

import type { ProductEntity } from '../src/models/product/model.js';

function product(id: string): ProductEntity {
  return { id } as ProductEntity;
}

describe('sortProductsByCategoryOrder', () => {
  it('orders products by their index in orderedIds', () => {
    const products = [product('a'), product('b'), product('c')];

    const sorted = sortProductsByCategoryOrder(products, ['c', 'a', 'b']);

    expect(sorted.map((p) => p.id)).toEqual(['c', 'a', 'b']);
  });

  it('appends members missing from orderedIds, preserving input order', () => {
    const products = [product('a'), product('b'), product('c'), product('d')];

    const sorted = sortProductsByCategoryOrder(products, ['c', 'a']);

    expect(sorted.map((p) => p.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('ignores ids in orderedIds that are not current members', () => {
    const products = [product('a'), product('b')];

    const sorted = sortProductsByCategoryOrder(products, ['stale', 'b', 'a']);

    expect(sorted.map((p) => p.id)).toEqual(['b', 'a']);
  });

  it('returns products unchanged when orderedIds is empty', () => {
    const products = [product('a'), product('b')];

    const sorted = sortProductsByCategoryOrder(products, []);

    expect(sorted.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('tolerates undefined orderedIds (pre-productOrder categories)', () => {
    const products = [product('a'), product('b')];

    const sorted = sortProductsByCategoryOrder(products, undefined);

    expect(sorted.map((p) => p.id)).toEqual(['a', 'b']);
  });
});
