/**
 * Folds a cart line into an identical earlier one.
 *
 * Two lines are the same line when ALL of these match:
 *
 * - `productId`.
 * - `selectedOptions`, compared as a SET. The assistant writes this array and
 *   its ordering is not stable, so comparing order would merge the same drink
 *   sometimes and not others.
 * - `notes`. "no scallions" and no note are different instructions to the
 *   kitchen. Absent, empty and whitespace-only are the same note.
 * - `addedByParticipantId`. This is a shared cart: merging across guests would
 *   silently move ownership, and with it who may edit the line and whose
 *   subtotal it counts towards.
 *
 * Pure, so the rule can be tested without a cart around it.
 */

import type { CartItemSnapshot } from '@src/models/cart/model';

/** The per-line ceiling the request schemas already enforce. */
export const CART_LINE_MAX_QUANTITY = 99;

function mergeKey(item: CartItemSnapshot): string {
  const options = item.selectedOptions
    .map((option) => `${option.modifierId}:${option.optionId}`)
    .sort();

  return JSON.stringify([
    item.productId,
    options,
    (item.notes ?? '').trim(),
    item.addedByParticipantId ?? null,
  ]);
}

export type CartItemMergeResult =
  | { status: 'unchanged'; items: CartItemSnapshot[] }
  | { status: 'merged'; items: CartItemSnapshot[]; survivorId: string }
  | { status: 'over_limit'; quantity: number };

/**
 * Merges the line `changedItemId` — just added or just edited — with the
 * earliest other line it is identical to.
 *
 * Only the changed line is considered. A cart written before this rule may hold
 * duplicates the guest did not just touch, and sweeping those up as a side
 * effect of an unrelated edit would move lines the guest was not looking at.
 *
 * The EARLIER of the two keeps its place, `id` and `createdAt`, so the list does
 * not reorder under the guest. Everything else comes from the changed line: it
 * was built against the menu a moment ago, so its names and price are the
 * current ones.
 *
 * A sum past the per-line ceiling is reported, never clamped: clamping would
 * quietly drop items the guest asked for.
 */
export function mergeChangedCartItem(
  items: CartItemSnapshot[],
  changedItemId: string,
): CartItemMergeResult {
  const changedIndex = items.findIndex((item) => item.id === changedItemId);
  const changed = items[changedIndex];

  if (!changed) {
    return { status: 'unchanged', items };
  }

  const key = mergeKey(changed);
  const otherIndex = items.findIndex(
    (item, index) => index !== changedIndex && mergeKey(item) === key,
  );
  const other = items[otherIndex];

  if (!other) {
    return { status: 'unchanged', items };
  }

  const quantity = changed.quantity + other.quantity;

  if (quantity > CART_LINE_MAX_QUANTITY) {
    return { status: 'over_limit', quantity };
  }

  const survivorIndex = Math.min(changedIndex, otherIndex);
  const absorbedIndex = Math.max(changedIndex, otherIndex);
  const earliest = survivorIndex === changedIndex ? changed : other;
  const survivor: CartItemSnapshot = {
    ...changed,
    id: earliest.id,
    createdAt: earliest.createdAt,
    quantity,
    totalItemPrice: changed.unitPrice * quantity,
  };

  return {
    status: 'merged',
    survivorId: survivor.id,
    items: items.flatMap((item, index) =>
      index === survivorIndex
        ? [survivor]
        : index === absorbedIndex
          ? []
          : [item],
    ),
  };
}
