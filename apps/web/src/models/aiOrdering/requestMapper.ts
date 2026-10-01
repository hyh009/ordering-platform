import type { AddCartItemRequest, UpdateCartItemRequest } from '@/models/cart';
import type { AiOrderingOperationModel } from './types';

/**
 * One assistant operation expressed in the cart's own vocabulary.
 *
 * `kind` is deliberately not the operation's `type`: the apply flow dispatches to
 * the existing cart commands, and those know about adding, updating and removing
 * items — not about `update_own_item`. Translating here means the cart side never
 * learns the assistant's words, and the ownership qualifier (`own`), which the
 * backend already validated, does not travel into a request that has no field
 * for it.
 */
export type AiOrderingCartRequest =
  | { kind: 'add'; request: AddCartItemRequest }
  | { kind: 'update'; itemId: string; request: UpdateCartItemRequest }
  | { kind: 'remove'; itemId: string };

export function toAiOrderingCartRequest(
  operation: AiOrderingOperationModel,
): AiOrderingCartRequest {
  switch (operation.type) {
    case 'add_item':
      return { kind: 'add', request: operation.item };

    case 'update_own_item':
      return {
        kind: 'update',
        itemId: operation.itemId,
        request: operation.item,
      };

    case 'remove_own_item':
      return { kind: 'remove', itemId: operation.itemId };
  }
}
