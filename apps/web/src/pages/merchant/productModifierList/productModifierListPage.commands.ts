import type { ProductModifierListActions } from '@/features/menu/productModifierList/actions';
import {
  createProductModifierListCommands,
  type LoadProductModifiersResult,
  type ProductModifierListCommands,
  type SaveProductModifierResult,
} from '@/features/menu/productModifierList/commands';

export type { LoadProductModifiersResult, SaveProductModifierResult };

export type ProductModifierListPageCommands = Pick<
  ProductModifierListCommands,
  'createProductModifier' | 'loadProductModifiers' | 'updateProductModifier'
>;

export function createProductModifierListPageCommands(
  actions: ProductModifierListActions,
): ProductModifierListPageCommands {
  const base = createProductModifierListCommands(actions);

  return {
    createProductModifier: base.createProductModifier,
    loadProductModifiers: base.loadProductModifiers,
    updateProductModifier: base.updateProductModifier,
  };
}
