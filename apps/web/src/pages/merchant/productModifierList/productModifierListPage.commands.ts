import type { ProductModifierListActions } from '@/features/merchant/menu/productModifiers/list/actions';
import {
  createProductModifierListCommands,
  type LoadProductModifiersResult,
} from '@/features/merchant/menu/productModifiers/list/commands';
import type { ProductModifierActiveFilter } from '@/models/productModifier';

export type ProductModifierListPageCommands = {
  loadProductModifiers(
    storeId: string,
    isActive: ProductModifierActiveFilter,
  ): Promise<LoadProductModifiersResult>;
};

export function createProductModifierListPageCommands(
  actions: ProductModifierListActions,
): ProductModifierListPageCommands {
  const base = createProductModifierListCommands(actions);

  return {
    loadProductModifiers: base.loadProductModifiers,
  };
}
