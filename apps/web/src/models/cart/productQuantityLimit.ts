import type { CartItem } from './types';

/**
 * How many of ONE product a guest may have in the cart at once.
 *
 * Counted per product across every line, whatever the options: 3 black tea
 * without sugar plus 97 with half sugar is 100 of one product. Past this the
 * guest is asked to speak to a member of staff instead of the request being
 * sent.
 *
 * Deliberately the live cart only. In a pay-later order a submitted round has
 * left the cart, so quantities already sent to the kitchen are not counted: the
 * cap is per round.
 *
 * A guard on what this app sends, not a guarantee about the cart.
 */
export const MAX_PRODUCT_QUANTITY = 99;

type CountedItem = Pick<CartItem, 'productId' | 'quantity'>;

/** How a write would move one product's total; negative for a decrease. */
export type ProductQuantityChange = { productId: string; delta: number };

export function countProductQuantity(
  items: readonly CountedItem[],
  productId: string,
): number {
  return items.reduce(
    (sum, item) => (item.productId === productId ? sum + item.quantity : sum),
    0,
  );
}

/**
 * Whether applying `changes` together would take any product past the limit.
 *
 * Only a net INCREASE can be refused. A cart that is already over — it can be,
 * since nothing but this app enforces the limit — must still let the guest
 * reduce it, or change something that leaves the total alone.
 */
export function exceedsProductQuantityLimit(
  items: readonly CountedItem[],
  changes: readonly ProductQuantityChange[],
): boolean {
  const deltaByProductId = new Map<string, number>();

  for (const change of changes) {
    deltaByProductId.set(
      change.productId,
      (deltaByProductId.get(change.productId) ?? 0) + change.delta,
    );
  }

  for (const [productId, delta] of deltaByProductId) {
    if (
      delta > 0 &&
      countProductQuantity(items, productId) + delta > MAX_PRODUCT_QUANTITY
    ) {
      return true;
    }
  }

  return false;
}

/**
 * The change an edit to one cart line makes. An edit that leaves the quantity
 * alone moves no total, and one aimed at a line that is not there moves none
 * either — the server answers that one.
 */
export function cartItemQuantityChange(
  items: readonly (CountedItem & Pick<CartItem, 'id'>)[],
  itemId: string,
  quantity: number | undefined,
): ProductQuantityChange[] {
  const item = items.find((candidate) => candidate.id === itemId);

  if (!item || quantity === undefined) return [];

  return [{ productId: item.productId, delta: quantity - item.quantity }];
}
