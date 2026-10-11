/**
 * The one line shown beside a proposed operation.
 *
 * Derived from the operation, the menu and the cart — never written by the
 * model. A label the model authors is prose nobody reconciles with the fields
 * that execute, and it will eventually describe a change the operation does not
 * make: an assistant once announced a spicy note while proposing only a quantity
 * the item already had, and the row read "Added".
 *
 * Built from the operation's own fields, so it cannot say more than the
 * operation does.
 *
 * Language: names are taken in the locale the guest's interface is in, the same
 * strings the menu beside the panel shows, falling back to the store's default
 * locale when the request names none. A name the menu does not carry in that
 * locale is shown in one it does carry, rather than as an id.
 */

import type {
  AiOrderingOperation,
  CartDto,
  LocalizedStringDto,
  PublicMenuDto,
  SupportedLocale,
} from '@repo/shared';

export type AiOrderingLabelContext = {
  menu: PublicMenuDto;
  cart: CartDto;
  locale: SupportedLocale;
};

const NOTE_REMOVED_LABEL: Record<SupportedLocale, string> = {
  en: '— note removed',
  'zh-TW': '— 移除備註',
};

function localize(
  value: LocalizedStringDto,
  locale: SupportedLocale,
  fallback: string,
): string {
  return value[locale] ?? Object.values(value).find(Boolean) ?? fallback;
}

function productName(
  productId: string,
  context: AiOrderingLabelContext,
): string {
  for (const group of context.menu.groups) {
    for (const product of group.products) {
      if (product.id === productId) {
        return localize(product.name, context.locale, productId);
      }
    }
  }

  return productId;
}

function cartItemName(itemId: string, context: AiOrderingLabelContext): string {
  const item = context.cart.items.find((candidate) => candidate.id === itemId);

  return item ? localize(item.productName, context.locale, itemId) : itemId;
}

function optionLabels(
  selections: { modifierId: string; optionId: string }[] | undefined,
  context: AiOrderingLabelContext,
): string[] {
  if (!selections) return [];

  return selections.map((selection) => {
    const modifier = context.menu.modifiers.find(
      (candidate) => candidate.id === selection.modifierId,
    );
    const option = modifier?.options.find(
      (candidate) => candidate.id === selection.optionId,
    );

    return option
      ? localize(option.name, context.locale, selection.optionId)
      : selection.optionId;
  });
}

export function buildAiOrderingOperationLabel(
  operation: AiOrderingOperation,
  context: AiOrderingLabelContext,
  /**
   * `omitChoices` leaves the selected options out, for a surface that lists the
   * choices itself and lets the guest change them. Everything else is the same
   * line, so the two cannot drift apart.
   */
  options: { omitChoices?: boolean } = {},
): string {
  switch (operation.type) {
    case 'add_item': {
      const parts = [
        `+ ${productName(operation.item.productId, context)} ×${String(operation.item.quantity)}`,
        ...(options.omitChoices
          ? []
          : optionLabels(operation.item.selectedOptions, context)),
      ];

      if (operation.item.notes !== undefined) {
        parts.push(`“${operation.item.notes}”`);
      }

      return parts.join(' · ');
    }

    case 'update_own_item': {
      // Only what CHANGES is named. Listing the untouched parts would make the
      // label describe the item rather than the operation, which is the gap this
      // whole module exists to close.
      const changes: string[] = [];

      if (operation.item.quantity !== undefined) {
        changes.push(`×${String(operation.item.quantity)}`);
      }

      if (
        operation.item.selectedOptions !== undefined &&
        !options.omitChoices
      ) {
        changes.push(...optionLabels(operation.item.selectedOptions, context));
      }

      if (operation.item.notes === null) {
        changes.push(NOTE_REMOVED_LABEL[context.locale]);
      } else if (operation.item.notes !== undefined) {
        changes.push(`“${operation.item.notes}”`);
      }

      const name = cartItemName(operation.itemId, context);

      return changes.length > 0
        ? `${name} → ${changes.join(' · ')}`
        : // Validation rejects an operation that changes nothing, so this is
          // unreachable through the normal path; it stays honest rather than
          // inventing a change if that ever stops being true.
          name;
    }

    case 'remove_own_item':
      return `− ${cartItemName(operation.itemId, context)}`;
  }
}
