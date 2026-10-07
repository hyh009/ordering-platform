import type { AiOrderingOperationModel } from './types';
import type { CartItem, ProductQuantityChange } from '@/models/cart';

/**
 * How a set of proposed operations would move each product's total, for the
 * per-product quantity limit.
 *
 * An operation aimed at a line that is not in the cart moves nothing here: the
 * server refuses it on its own row, and guessing at a product for it would
 * refuse a whole proposal over a line that was never going to be written.
 */
export function proposalQuantityChanges(
  operations: readonly AiOrderingOperationModel[],
  items: readonly Pick<CartItem, 'id' | 'productId' | 'quantity'>[],
): ProductQuantityChange[] {
  return operations.flatMap((operation): ProductQuantityChange[] => {
    if (operation.type === 'add_item') {
      return [
        { productId: operation.item.productId, delta: operation.item.quantity },
      ];
    }

    const target = items.find((item) => item.id === operation.itemId);

    if (!target) return [];

    if (operation.type === 'remove_own_item') {
      return [{ productId: target.productId, delta: -target.quantity }];
    }

    return operation.item.quantity === undefined
      ? []
      : [
          {
            productId: target.productId,
            delta: operation.item.quantity - target.quantity,
          },
        ];
  });
}
