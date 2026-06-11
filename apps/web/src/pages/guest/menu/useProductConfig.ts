import { useMemo, useState } from 'react';
import type { AddCartItemRequest } from '@/models/cart';
import type { PublicModifier, PublicProduct } from '@/models/guestMenu';

export type ProductConfigModifier = PublicModifier;

type SelectionMap = Record<string, string[]>;

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

export function useProductConfig(
  product: PublicProduct,
  modifiers: PublicModifier[],
) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selection, setSelection] = useState<SelectionMap>(() =>
    buildDefaults(modifiers),
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

  const isValid = useMemo(
    () =>
      modifiers.every((modifier) => {
        const count = selection[modifier.id]?.length ?? 0;
        return count >= modifier.minSelect && count <= modifier.maxSelect;
      }),
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

  function buildRequest(): AddCartItemRequest {
    const selectedOptions = modifiers.flatMap((modifier) =>
      (selection[modifier.id] ?? []).map((optionId) => ({
        modifierId: modifier.id,
        optionId,
      })),
    );

    const trimmedNotes = notes.trim();

    return {
      productId: product.id,
      quantity,
      ...(selectedOptions.length > 0 ? { selectedOptions } : {}),
      ...(trimmedNotes.length > 0 ? { notes: trimmedNotes } : {}),
    };
  }

  return {
    quantity,
    setQuantity,
    notes,
    setNotes,
    selection,
    toggleOption,
    isValid,
    unitPrice,
    buildRequest,
  };
}
