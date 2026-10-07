import type { ProductConfigInitial } from '@/features/storeFront/components/useProductConfig';
import type { CartItem } from '@/models/cart';
import type {
  PublicMenu,
  PublicModifier,
  PublicProduct,
} from '@/models/storeFrontMenu';

/** Everything the option picker needs to open on a cart item. */
export type CartItemEditTarget = {
  item: CartItem;
  product: PublicProduct;
  modifiers: PublicModifier[];
  initial: ProductConfigInitial;
};

export type CartItemEditResolution =
  | { status: 'editable'; target: CartItemEditTarget }
  /** Someone else's item. Read-only here, and the server refuses it too. */
  | { status: 'not-owner' }
  /** The product has left the menu, so there are no options to offer. */
  | { status: 'unavailable' };

/**
 * Only the guest who added an item may change it. A shared cart shows everyone's
 * items, and this is the one answer to "is this one mine" for the edit control.
 */
export function canEditCartItem(
  item: Pick<CartItem, 'addedByParticipantId'>,
  participantId: string | null,
): boolean {
  return participantId !== null && item.addedByParticipantId === participantId;
}

/**
 * Resolves a cart item against the menu into what the picker opens on.
 *
 * The choices offered are the product's as the menu has them NOW, not as they
 * were when the item was added: a save is validated against the current menu,
 * so offering anything else would offer what cannot be saved.
 */
export function resolveCartItemEdit(input: {
  item: CartItem;
  participantId: string | null;
  menu: PublicMenu;
}): CartItemEditResolution {
  const { item, participantId, menu } = input;

  if (!canEditCartItem(item, participantId)) {
    return { status: 'not-owner' };
  }

  const product = menu.groups
    .flatMap((group) => group.products)
    .find((candidate) => candidate.id === item.productId);

  if (!product) {
    return { status: 'unavailable' };
  }

  const modifiers = product.modifierIds
    .map((id) => menu.modifiers.find((modifier) => modifier.id === id))
    .filter((modifier): modifier is PublicModifier => modifier !== undefined);

  return {
    status: 'editable',
    target: {
      item,
      product,
      modifiers,
      initial: {
        quantity: item.quantity,
        ...(item.notes !== undefined ? { notes: item.notes } : {}),
        selectedOptions: item.selectedOptions.map((option) => ({
          modifierId: option.modifierId,
          optionId: option.optionId,
        })),
      },
    },
  };
}
