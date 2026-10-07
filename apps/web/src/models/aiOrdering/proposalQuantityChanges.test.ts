import { describe, expect, it } from 'vitest';

import { proposalQuantityChanges } from './proposalQuantityChanges';

const items = [
  { id: 'line-1', productId: 'tea', quantity: 4 },
  { id: 'line-2', productId: 'cake', quantity: 2 },
];

describe('proposalQuantityChanges', () => {
  it('counts an added item at its quantity', () => {
    expect(
      proposalQuantityChanges(
        [
          {
            type: 'add_item',
            operationId: 'op-1',
            summary: '+ tea ×3',
            item: { productId: 'tea', quantity: 3 },
          },
        ],
        items,
      ),
    ).toEqual([{ productId: 'tea', delta: 3 }]);
  });

  it('counts a quantity update as the difference from the line it edits', () => {
    expect(
      proposalQuantityChanges(
        [
          {
            type: 'update_own_item',
            operationId: 'op-1',
            summary: 'tea → ×10',
            itemId: 'line-1',
            item: { quantity: 10 },
          },
        ],
        items,
      ),
    ).toEqual([{ productId: 'tea', delta: 6 }]);
  });

  it('counts a removal as giving the whole line back', () => {
    expect(
      proposalQuantityChanges(
        [
          {
            type: 'remove_own_item',
            operationId: 'op-1',
            summary: '− cake',
            itemId: 'line-2',
          },
        ],
        items,
      ),
    ).toEqual([{ productId: 'cake', delta: -2 }]);
  });

  it('ignores an update that leaves the quantity alone, and a line that is gone', () => {
    expect(
      proposalQuantityChanges(
        [
          {
            type: 'update_own_item',
            operationId: 'op-1',
            summary: 'tea → “less ice”',
            itemId: 'line-1',
            item: { notes: 'less ice' },
          },
          {
            type: 'update_own_item',
            operationId: 'op-2',
            summary: 'gone → ×50',
            itemId: 'gone',
            item: { quantity: 50 },
          },
        ],
        items,
      ),
    ).toEqual([]);
  });
});
