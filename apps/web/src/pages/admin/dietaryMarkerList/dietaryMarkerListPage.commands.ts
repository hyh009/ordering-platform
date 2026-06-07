import type { DietaryMarkerListActions } from '@/features/admin/metadata/dietaryMarkers/list/actions';
import {
  createDietaryMarkerListCommands,
  type DietaryMarkerListCommands,
  type LoadDietaryMarkersResult,
} from '@/features/admin/metadata/dietaryMarkers/list/commands';
import {
  createDietaryMarkerMutationCommands,
  type SaveDietaryMarkerResult,
} from '@/features/admin/metadata/dietaryMarkers/mutations/commands';
import type {
  CreateDietaryMarkerRequest,
  MetadataActiveFilter,
  UpdateDietaryMarkerRequest,
} from '@/models/metadata';

export type { LoadDietaryMarkersResult, SaveDietaryMarkerResult };

export type DietaryMarkerListPageCommands = Pick<
  DietaryMarkerListCommands,
  'loadDietaryMarkers'
> & {
  createDietaryMarker(
    isActive: MetadataActiveFilter,
    input: CreateDietaryMarkerRequest,
  ): Promise<SaveDietaryMarkerResult>;
  updateDietaryMarker(
    isActive: MetadataActiveFilter,
    dietaryMarkerId: string,
    input: UpdateDietaryMarkerRequest,
  ): Promise<SaveDietaryMarkerResult>;
};

export function createDietaryMarkerListPageCommands(
  actions: DietaryMarkerListActions,
): DietaryMarkerListPageCommands {
  const listCommands = createDietaryMarkerListCommands(actions);
  const mutationCommands = createDietaryMarkerMutationCommands();

  return {
    async createDietaryMarker(isActive, input) {
      const result = await mutationCommands.createDietaryMarker(input);

      if (result.status === 'saved') {
        await listCommands.loadDietaryMarkers(isActive);
      }

      return result;
    },

    loadDietaryMarkers: listCommands.loadDietaryMarkers,

    async updateDietaryMarker(isActive, dietaryMarkerId, input) {
      const result = await mutationCommands.updateDietaryMarker(
        dietaryMarkerId,
        input,
      );

      if (result.status === 'saved') {
        await listCommands.loadDietaryMarkers(isActive);
      }

      return result;
    },
  };
}
