import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import type { SupportedLocale } from '@/models/metadata';
import { createProductFormOptionsCommands } from '../../formOptions/commands';
import { createProductFormOptionsRuntime } from '../../formOptions/runtime';
import type { ProductFormOptions } from '../../formOptions/store';

export type { ProductFormOptions };

function createFormOptionsContext() {
  const { actions, store } = createProductFormOptionsRuntime();
  const commands = createProductFormOptionsCommands(actions);

  return { commands, store };
}

/**
 * Loads the product form's picker option lists (categories, tags, modifiers
 * from the store; allergens, dietary markers from platform metadata) through
 * the products `formOptions` aggregate read slice, and exposes them as
 * `MultiSelect` options. The form's consumption entry for that slice; create
 * and detail page VMs both call it.
 */
export function useProductFormOptions(
  storeId: string | null | undefined,
  locale: SupportedLocale,
): ProductFormOptions {
  const [{ commands, store }] = useState(createFormOptionsContext);

  useEffect(() => {
    if (!storeId) return;

    void commands.loadFormOptions(storeId, locale);
  }, [commands, storeId, locale]);

  return useStore(store);
}
