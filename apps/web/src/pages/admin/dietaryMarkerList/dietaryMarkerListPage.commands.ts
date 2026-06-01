import type {
  DietaryMarkerListActions,
} from '@/features/metadata/dietaryMarkerList/actions';
import {
  createDietaryMarkerListCommands,
  type DietaryMarkerListCommands,
  type LoadDietaryMarkersResult,
  type SaveDietaryMarkerResult,
} from '@/features/metadata/dietaryMarkerList/commands';

export type { LoadDietaryMarkersResult, SaveDietaryMarkerResult };

export type DietaryMarkerListPageCommands = Pick<
  DietaryMarkerListCommands,
  'createDietaryMarker' | 'loadDietaryMarkers' | 'updateDietaryMarker'
>;

export function createDietaryMarkerListPageCommands(
  actions: DietaryMarkerListActions,
): DietaryMarkerListPageCommands {
  const base = createDietaryMarkerListCommands(actions);

  const overrides = {} satisfies Partial<DietaryMarkerListPageCommands>;

  return {
    createDietaryMarker: base.createDietaryMarker,
    loadDietaryMarkers: base.loadDietaryMarkers,
    updateDietaryMarker: base.updateDietaryMarker,
    ...overrides,
  };
}
