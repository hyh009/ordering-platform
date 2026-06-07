import type { AllergenListActions } from '@/features/metadata/allergens/list/actions';
import {
  createAllergenListCommands,
  type AllergenListCommands,
  type LoadAllergensResult,
} from '@/features/metadata/allergens/list/commands';
import {
  createAllergenMutationCommands,
  type SaveAllergenResult,
} from '@/features/metadata/allergens/mutations/commands';
import type {
  CreateAllergenRequest,
  MetadataActiveFilter,
  UpdateAllergenRequest,
} from '@/models/metadata';

export type { LoadAllergensResult, SaveAllergenResult };

export type AllergenListPageCommands = Pick<
  AllergenListCommands,
  'loadAllergens'
> & {
  createAllergen(
    isActive: MetadataActiveFilter,
    input: CreateAllergenRequest,
  ): Promise<SaveAllergenResult>;
  updateAllergen(
    isActive: MetadataActiveFilter,
    allergenId: string,
    input: UpdateAllergenRequest,
  ): Promise<SaveAllergenResult>;
};

export function createAllergenListPageCommands(
  actions: AllergenListActions,
): AllergenListPageCommands {
  const listCommands = createAllergenListCommands(actions);
  const mutationCommands = createAllergenMutationCommands();

  return {
    async createAllergen(isActive, input) {
      const result = await mutationCommands.createAllergen(input);

      if (result.status === 'saved') {
        await listCommands.loadAllergens(isActive);
      }

      return result;
    },
    loadAllergens: listCommands.loadAllergens,
    async updateAllergen(isActive, allergenId, input) {
      const result = await mutationCommands.updateAllergen(allergenId, input);

      if (result.status === 'saved') {
        await listCommands.loadAllergens(isActive);
      }

      return result;
    },
  };
}
