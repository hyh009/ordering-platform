import type { MetadataActiveFilter } from '@/models/metadata';
import { metadataService } from '@/services/metadata.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/services/utils/adminApiError';
import type { DietaryMarkerListActions } from './actions';

export type LoadDietaryMarkersResult =
  | {
      status: 'loaded';
    }
  | AdminCommandFailure;

export type DietaryMarkerListCommands = {
  loadDietaryMarkers(
    isActive: MetadataActiveFilter,
  ): Promise<LoadDietaryMarkersResult>;
};

export function createDietaryMarkerListCommands(
  actions: DietaryMarkerListActions,
): DietaryMarkerListCommands {
  return {
    async loadDietaryMarkers(isActive) {
      actions.loadStarted();

      try {
        const dietaryMarkers =
          await metadataService.listDietaryMarkers(isActive);

        actions.loadSucceeded(dietaryMarkers);
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
