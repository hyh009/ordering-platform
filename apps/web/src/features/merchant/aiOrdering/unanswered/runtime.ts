import { createAiOrderingUnansweredActions } from './actions';
import { createAiOrderingUnansweredStore } from './store';

export function createAiOrderingUnansweredRuntime() {
  const store = createAiOrderingUnansweredStore();
  const actions = createAiOrderingUnansweredActions(store);

  return { actions, store };
}
