import type {
  AiOrderingUnansweredEntry,
  AiOrderingUnansweredReason,
} from '@/models/aiOrdering';
import type { AiOrderingUnansweredStore } from './store';

export function createAiOrderingUnansweredActions(
  store: AiOrderingUnansweredStore,
) {
  return {
    loadStarted() {
      store.setState({ error: null, isLoading: true });
    },

    loadFailed(error: string) {
      store.setState({ error, isLoading: false });
    },

    loaded(result: {
      entries: AiOrderingUnansweredEntry[];
      total: number;
      page: number;
      pageSize: number;
      reason: AiOrderingUnansweredReason | null;
    }) {
      store.setState({
        entries: result.entries,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        // Stored with the page it produced, so the filter and the rows on
        // screen can never disagree about what is being shown.
        reason: result.reason,
        error: null,
        isLoading: false,
      });
    },
  };
}

export type AiOrderingUnansweredActions = ReturnType<
  typeof createAiOrderingUnansweredActions
>;
