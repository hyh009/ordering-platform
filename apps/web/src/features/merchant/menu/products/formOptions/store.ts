import { createStore } from 'zustand/vanilla';
import type { ProductModifier } from '@/models/productModifier';
import type { MultiSelectOption } from '@/shared/components/form/MultiSelect';

// Aggregate read model for the product form's pickers: the selectable option
// lists drawn from several sibling resources (categories, tags, modifiers) plus
// platform metadata (allergens, dietary markers). Owned by the products feature
// because it serves the product form, not any single source resource.
export type ProductFormOptions = {
  categories: MultiSelectOption[];
  tags: MultiSelectOption[];
  modifiers: MultiSelectOption[];
  allergens: MultiSelectOption[];
  dietaryMarkers: MultiSelectOption[];
  modifiersById: Map<string, ProductModifier>;
  isLoading: boolean;
  error: string | null;
};

export function createProductFormOptionsStore() {
  return createStore<ProductFormOptions>(() => ({
    categories: [],
    tags: [],
    modifiers: [],
    allergens: [],
    dietaryMarkers: [],
    modifiersById: new Map(),
    isLoading: false,
    error: null,
  }));
}

export type ProductFormOptionsStore = ReturnType<
  typeof createProductFormOptionsStore
>;
