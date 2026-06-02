import { createStore } from 'zustand/vanilla';
import type { DietaryMarker } from '@/models/metadata';

export type DietaryMarkerListState = {
  dietaryMarkers: DietaryMarker[];
  error: string | null;
  isLoading: boolean;
};

export function createDietaryMarkerListStore() {
  return createStore<DietaryMarkerListState>(() => ({
    dietaryMarkers: [],
    error: null,
    isLoading: false,
  }));
}
