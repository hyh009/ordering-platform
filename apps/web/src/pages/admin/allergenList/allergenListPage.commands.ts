import type {
  AllergenListActions,
} from '@/features/metadata/allergenList/actions';
import {
  createAllergenListCommands,
  type AllergenListCommands,
  type LoadAllergensResult,
  type SaveAllergenResult,
} from '@/features/metadata/allergenList/commands';

export type { LoadAllergensResult, SaveAllergenResult };

export type AllergenListPageCommands = Pick<
  AllergenListCommands,
  'createAllergen' | 'loadAllergens' | 'updateAllergen'
>;

export function createAllergenListPageCommands(
  actions: AllergenListActions,
): AllergenListPageCommands {
  const base = createAllergenListCommands(actions);

  const overrides = {} satisfies Partial<AllergenListPageCommands>;

  return {
    createAllergen: base.createAllergen,
    loadAllergens: base.loadAllergens,
    updateAllergen: base.updateAllergen,
    ...overrides,
  };
}
