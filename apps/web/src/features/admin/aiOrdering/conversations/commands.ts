import { adminAiOrderingService } from '@/services/adminAiOrdering.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/services/utils/adminApiError';

import type { AdminAiOrderingConversationsActions } from './actions';

export type AdminAiOrderingConversationsCommands = {
  loadConversations(
    storeId: string,
    query: { page?: number; pageSize?: number },
  ): Promise<{ status: 'loaded' } | AdminCommandFailure>;
  loadConversation(
    storeId: string,
    conversationId: string,
  ): Promise<{ status: 'loaded' } | AdminCommandFailure>;
  clearConversation(): void;
};

export function createAdminAiOrderingConversationsCommands(
  actions: AdminAiOrderingConversationsActions,
): AdminAiOrderingConversationsCommands {
  return {
    clearConversation() {
      actions.detailCleared();
    },

    async loadConversations(storeId, query) {
      actions.loadStarted();

      try {
        const result = await adminAiOrderingService.listConversations(
          storeId,
          query,
        );

        actions.listLoaded(result);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapAdminApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },

    async loadConversation(storeId, conversationId) {
      actions.loadStarted();

      try {
        const detail = await adminAiOrderingService.getConversation(
          storeId,
          conversationId,
        );

        actions.detailLoaded(detail);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapAdminApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },
  };
}
