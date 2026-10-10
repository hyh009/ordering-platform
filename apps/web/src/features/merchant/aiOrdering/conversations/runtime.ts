import { createAiOrderingConversationsActions } from './actions';
import { createAiOrderingConversationsStore } from './store';

export function createAiOrderingConversationsRuntime() {
  const store = createAiOrderingConversationsStore();
  const actions = createAiOrderingConversationsActions(store);

  return { actions, store };
}
