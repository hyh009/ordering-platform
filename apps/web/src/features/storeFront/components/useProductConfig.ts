import { useMemo, useState } from 'react';
import type { AddCartItemRequest, UpdateCartItemRequest } from '@/models/cart';
import type { PublicModifier, PublicProduct } from '@/models/storeFrontMenu';

export type ProductConfigModifier = PublicModifier;

type SelectionMap = Record<string, string[]>;

/**
 * What an item already in the cart holds, to open the picker on instead of the
 * menu's defaults.
 */
export type ProductConfigInitial = {
  quantity: number;
  notes?: string;
  selectedOptions: { modifierId: string; optionId: string }[];
};

function buildDefaults(modifiers: PublicModifier[]): SelectionMap {
  const selection: SelectionMap = {};
  for (const modifier of modifiers) {
    const defaults = modifier.options
      .filter((option) => option.isDefault && !option.isSoldOut)
      .map((option) => option.id);
    selection[modifier.id] = defaults.slice(0, modifier.maxSelect);
  }
  return selection;
}

/**
 * The selection the picker opens on.
 *
 * For an item being edited that is what the item holds — never the menu's
 * defaults, which would silently swap a choice the guest made for one they did
 * not. An option the item holds that has since sold out or left the menu is
 * dropped rather than kept: saving it would be refused, so the guest is shown
 * the gap and picks again.
 */
export function buildInitialSelection(
  modifiers: PublicModifier[],
  initial?: ProductConfigInitial,
): SelectionMap {
  if (!initial) return buildDefaults(modifiers);

  const selection: SelectionMap = {};
  for (const modifier of modifiers) {
    const held = new Set(
      initial.selectedOptions
        .filter((selected) => selected.modifierId === modifier.id)
        .map((selected) => selected.optionId),
    );
    selection[modifier.id] = modifier.options
      .filter((option) => held.has(option.id) && !option.isSoldOut)
      .map((option) => option.id)
      .slice(0, modifier.maxSelect);
  }
  return selection;
}

export function isModifierSatisfied(
  modifier: PublicModifier,
  selected: string[] | undefined,
): boolean {
  const count = selected?.length ?? 0;
  return count >= modifier.minSelect && count <= modifier.maxSelect;
}

/**
 * Required choices before optional ones, each group in menu order — the order
 * the assistant's proposal card asks in, so changing an item reads the same
 * wherever the guest does it.
 */
export function orderModifiersRequiredFirst(
  modifiers: PublicModifier[],
): PublicModifier[] {
  return [
    ...modifiers.filter((modifier) => modifier.minSelect > 0),
    ...modifiers.filter((modifier) => modifier.minSelect === 0),
  ];
}

export function useProductConfig(
  product: PublicProduct,
  modifiers: PublicModifier[],
  initial?: ProductConfigInitial,
) {
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [selection, setSelection] = useState<SelectionMap>(() =>
    buildInitialSelection(modifiers, initial),
  );

  function toggleOption(modifier: PublicModifier, optionId: string) {
    setSelection((current) => {
      const selected = current[modifier.id] ?? [];

      if (modifier.selectionType === 'single_choice') {
        return { ...current, [modifier.id]: [optionId] };
      }

      if (selected.includes(optionId)) {
        return {
          ...current,
          [modifier.id]: selected.filter((id) => id !== optionId),
        };
      }

      if (selected.length >= modifier.maxSelect) {
        return current;
      }

      return { ...current, [modifier.id]: [...selected, optionId] };
    });
  }

  /** Declines an optional choice outright, whatever was picked for it. */
  function clearModifier(modifier: PublicModifier) {
    setSelection((current) => ({ ...current, [modifier.id]: [] }));
  }

  const isValid = useMemo(
    () =>
      modifiers.every((modifier) =>
        isModifierSatisfied(modifier, selection[modifier.id]),
      ),
    [modifiers, selection],
  );

  const unitPrice = useMemo(() => {
    const optionTotal = modifiers.reduce((sum, modifier) => {
      const selected = selection[modifier.id] ?? [];
      return (
        sum +
        modifier.options
          .filter((option) => selected.includes(option.id))
          .reduce((acc, option) => acc + option.priceAdjustment, 0)
      );
    }, 0);
    return product.price + optionTotal;
  }, [modifiers, product.price, selection]);

  function buildSelectedOptions() {
    return modifiers.flatMap((modifier) =>
      (selection[modifier.id] ?? []).map((optionId) => ({
        modifierId: modifier.id,
        optionId,
      })),
    );
  }

  function buildRequest(): AddCartItemRequest {
    const selectedOptions = buildSelectedOptions();
    const trimmedNotes = notes.trim();

    return {
      productId: product.id,
      quantity,
      ...(selectedOptions.length > 0 ? { selectedOptions } : {}),
      ...(trimmedNotes.length > 0 ? { notes: trimmedNotes } : {}),
    };
  }

  /**
   * The edit to an item already in the cart. Everything the sheet shows is
   * sent, including an empty selection and a removed note: on an update a
   * missing field means "leave it", so leaving one out could not take anything
   * away.
   */
  function buildUpdateRequest(): UpdateCartItemRequest {
    const trimmedNotes = notes.trim();

    return {
      quantity,
      selectedOptions: buildSelectedOptions(),
      notes: trimmedNotes.length > 0 ? trimmedNotes : null,
    };
  }

  return {
    quantity,
    setQuantity,
    notes,
    setNotes,
    selection,
    toggleOption,
    clearModifier,
    isValid,
    unitPrice,
    buildRequest,
    buildUpdateRequest,
  };
}
