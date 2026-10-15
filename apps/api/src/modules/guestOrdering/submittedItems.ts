/**
 * What a submission checks about its lines against the current menu, before
 * they become an order.
 *
 * Availability comes first and wins: a line that cannot be bought is never
 * priced, so a sold-out line can never cause a cart to be repriced as a side
 * effect. Price is compared exactly, in both directions: a drop is refused like
 * a rise, because the property worth keeping is "the guest saw this number".
 *
 * Pure, so the rules can be tested without a cart or a menu around them.
 */

import { ERROR_CODES } from '@src/utils/errorCode';
import { AppError } from '@src/utils/errors';

import type { CartDto, PriceChangedErrorDetails } from '@repo/shared';
import type { CartItemSnapshot } from '@src/models/cart/model';
import type { ProductEntity } from '@src/models/product/model';
import type { ProductModifierEntity } from '@src/models/productModifier/model';

export type UnavailableItem = {
  itemId: string;
  productId: string;
  reason: 'product_unavailable' | 'product_sold_out' | 'option_unavailable';
};

/** A changed line: what it stored, and the line at the current price. */
export type RepricedLine = {
  previousUnitPrice: number;
  item: CartItemSnapshot;
};

export type SubmittedItemsCheck = {
  unavailable: UnavailableItem[];
  /** Empty whenever `unavailable` is not. */
  repriced: RepricedLine[];
};

/** A line's unit price: the product's price plus each selected adjustment. */
export function unitPriceOf(
  productPrice: number,
  selectedOptions: { priceAdjustment: number }[],
): number {
  return (
    productPrice +
    selectedOptions.reduce((sum, option) => sum + option.priceAdjustment, 0)
  );
}

/** The line at a new unit price, with its total recomputed. */
export function repriceLine(
  item: CartItemSnapshot,
  selectedOptions: CartItemSnapshot['selectedOptions'],
  unitPrice: number,
): CartItemSnapshot {
  return {
    ...item,
    selectedOptions,
    unitPrice,
    totalItemPrice: unitPrice * item.quantity,
  };
}

/** Whether two snapshots of a line select the same options, in any order. */
export function hasSameSelection(
  a: CartItemSnapshot,
  b: CartItemSnapshot,
): boolean {
  const key = (item: CartItemSnapshot) =>
    item.selectedOptions
      .map((option) => `${option.modifierId}:${option.optionId}`)
      .sort()
      .join('|');
  return key(a) === key(b);
}

export function checkSubmittedItems(
  items: CartItemSnapshot[],
  productById: Map<string, ProductEntity>,
  modifierById: Map<string, ProductModifierEntity>,
): SubmittedItemsCheck {
  const unavailable: UnavailableItem[] = [];
  const repriced: RepricedLine[] = [];

  for (const item of items) {
    const product = productById.get(item.productId);

    if (!product || product.status !== 'published' || !product.isActive) {
      unavailable.push({
        itemId: item.id,
        productId: item.productId,
        reason: 'product_unavailable',
      });
      continue;
    }

    if (product.isSoldOut) {
      unavailable.push({
        itemId: item.id,
        productId: item.productId,
        reason: 'product_sold_out',
      });
      continue;
    }

    const options = item.selectedOptions.map((selection) =>
      modifierById
        .get(selection.modifierId)
        ?.options.find((candidate) => candidate.id === selection.optionId),
    );

    if (options.some((option) => !option?.isActive || option.isSoldOut)) {
      unavailable.push({
        itemId: item.id,
        productId: item.productId,
        reason: 'option_unavailable',
      });
      continue;
    }

    const selectedOptions = item.selectedOptions.map((selection, index) => ({
      ...selection,
      priceAdjustment: options[index]!.priceAdjustment,
    }));
    const currentUnitPrice = unitPriceOf(product.price, selectedOptions);

    if (currentUnitPrice !== item.unitPrice) {
      repriced.push({
        previousUnitPrice: item.unitPrice,
        item: repriceLine(item, selectedOptions, currentUnitPrice),
      });
    }
  }

  if (unavailable.length > 0) {
    return { unavailable, repriced: [] };
  }

  return { unavailable, repriced };
}

/**
 * The public `PRICE_CHANGED` refusal. It is thrown only after the cart has been
 * repriced, and carries that cart so the orchestrator can tell the session's
 * other devices; the cart itself is not part of the response.
 */
export class CartRepricedError extends AppError {
  constructor(
    repriced: RepricedLine[],
    public readonly cart: CartDto,
  ) {
    const details: PriceChangedErrorDetails = {
      changedItems: repriced.map(({ previousUnitPrice, item }) => ({
        itemId: item.id,
        productId: item.productId,
        previousUnitPrice,
        currentUnitPrice: item.unitPrice,
      })),
    };
    super(409, 'Some prices have changed', ERROR_CODES.PRICE_CHANGED, details);
  }
}
