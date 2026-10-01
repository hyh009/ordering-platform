import { describe, expect, it } from 'vitest';

import { toAiOrderingCartRequest } from './requestMapper';

describe('toAiOrderingCartRequest', () => {
  it('maps add_item to an add-item request', () => {
    expect(
      toAiOrderingCartRequest({
        type: 'add_item',
        operationId: 'op-1',
        summary: 'Add 1 bubble tea',
        item: {
          productId: 'product-1',
          quantity: 1,
          selectedOptions: [{ modifierId: 'mod-1', optionId: 'opt-1' }],
          notes: 'Less ice',
        },
      }),
    ).toEqual({
      kind: 'add',
      request: {
        productId: 'product-1',
        quantity: 1,
        selectedOptions: [{ modifierId: 'mod-1', optionId: 'opt-1' }],
        notes: 'Less ice',
      },
    });
  });

  it('maps update_own_item to an item id and an update request', () => {
    expect(
      toAiOrderingCartRequest({
        type: 'update_own_item',
        operationId: 'op-2',
        summary: 'Change to 2 portions',
        itemId: 'item-1',
        item: { quantity: 2, notes: null },
      }),
    ).toEqual({
      kind: 'update',
      itemId: 'item-1',
      request: { quantity: 2, notes: null },
    });
  });

  it('maps remove_own_item to an item id alone', () => {
    expect(
      toAiOrderingCartRequest({
        type: 'remove_own_item',
        operationId: 'op-3',
        summary: 'Remove the rice',
        itemId: 'item-2',
      }),
    ).toEqual({ kind: 'remove', itemId: 'item-2' });
  });

  it('does not carry the operation id into the cart request', () => {
    const mapped = toAiOrderingCartRequest({
      type: 'add_item',
      operationId: 'op-1',
      summary: 'Add 1 rice',
      item: { productId: 'product-2', quantity: 1 },
    });

    // The operation id identifies the row for outcome reporting. The cart has no
    // field for it, and sending it would make the request fail validation.
    expect(mapped.kind === 'add' && mapped.request).not.toHaveProperty(
      'operationId',
    );
  });
});
