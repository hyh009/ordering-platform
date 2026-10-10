import type {
  AiOrderingConversationDetail,
  AiOrderingConversationSummary,
} from '@/models/aiOrdering';
import type { AdminAiOrderingConversationsStore } from './store';

export function createAdminAiOrderingConversationsActions(
  store: AdminAiOrderingConversationsStore,
) {
  return {
    loadStarted() {
      store.setState({ error: null, isLoading: true });
    },

    loadFailed(error: string) {
      store.setState({ error, isLoading: false });
    },

    listLoaded(result: {
      conversations: AiOrderingConversationSummary[];
      total: number;
      page: number;
      pageSize: number;
    }) {
      store.setState({
        conversations: result.conversations,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        error: null,
        isLoading: false,
      });
    },

    detailLoaded(detail: AiOrderingConversationDetail) {
      store.setState({ detail, error: null, isLoading: false });
    },

    /** Cleared on leaving, so the next conversation never flashes the last one. */
    detailCleared() {
      store.setState({ detail: null });
    },
  };
}

export type AdminAiOrderingConversationsActions = ReturnType<
  typeof createAdminAiOrderingConversationsActions
>;
