import { createAdminAiOrderingConversationsActions } from './actions';
import { createAdminAiOrderingConversationsStore } from './store';

export function createAdminAiOrderingConversationsRuntime() {
  const store = createAdminAiOrderingConversationsStore();
  const actions = createAdminAiOrderingConversationsActions(store);

  return { actions, store };
}
