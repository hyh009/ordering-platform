import type { MetadataActiveFilter } from '@/models/metadata';
import { metadataService } from '@/services/metadata.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/services/utils/adminApiError';
import type { AllergenListActions } from './actions';

export type LoadAllergensResult =
  | {
      status: 'loaded';
    }
  | AdminCommandFailure;

export type AllergenListCommands = {
  loadAllergens(isActive: MetadataActiveFilter): Promise<LoadAllergensResult>;
};

export function createAllergenListCommands(
  actions: AllergenListActions,
): AllergenListCommands {
  return {
    async loadAllergens(isActive) {
      actions.loadStarted();

      try {
        const allergens = await metadataService.listAllergens(isActive);

        actions.loadSucceeded(allergens);
        return {
          status: 'loaded',
        };
      } catch (error) {
        const failure = mapAdminApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },
  };
}
