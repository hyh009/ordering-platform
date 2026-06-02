import type { DietaryMarker } from '@/models/metadata';
import type { DietaryMarkerListState } from './store';
import type { StoreApi } from 'zustand/vanilla';

export function createDietaryMarkerListActions(
  store: StoreApi<DietaryMarkerListState>,
) {
  return {
    loadStarted() {
      store.setState({
        error: null,
        isLoading: true,
      });
    },

    loadSucceeded(dietaryMarkers: DietaryMarker[]) {
      store.setState({
        dietaryMarkers,
        error: null,
        isLoading: false,
      });
    },

    loadFailed(error: string) {
      store.setState({
        error,
        isLoading: false,
      });
    },

    dietaryMarkerSaved(dietaryMarker: DietaryMarker) {
      store.setState((state) => {
        const exists = state.dietaryMarkers.some(
          (item) => item.id === dietaryMarker.id,
        );

        return {
          dietaryMarkers: exists
            ? state.dietaryMarkers.map((item) =>
                item.id === dietaryMarker.id ? dietaryMarker : item,
              )
            : [dietaryMarker, ...state.dietaryMarkers],
        };
      });
    },
  };
}

export type DietaryMarkerListActions = ReturnType<
  typeof createDietaryMarkerListActions
>;
