import { createDietaryMarkerListActions } from './actions';
import { createDietaryMarkerListStore } from './store';

export function createDietaryMarkerListRuntime() {
  const store = createDietaryMarkerListStore();
  const actions = createDietaryMarkerListActions(store);

  return {
    actions,
    store,
  };
}
