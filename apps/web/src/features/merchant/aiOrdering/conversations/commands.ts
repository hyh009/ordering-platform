import { merchantAiOrderingService } from '@/services/aiOrderingReview.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';

import type { AiOrderingConversationsActions } from './actions';

export type AiOrderingConversationsCommands = {
  loadConversations(
    storeId: string,
    query: { page?: number; pageSize?: number },
  ): Promise<{ status: 'loaded' } | MerchantCommandFailure>;
  loadConversation(
    storeId: string,
    conversationId: string,
  ): Promise<{ status: 'loaded' } | MerchantCommandFailure>;
  clearConversation(): void;
};

export function createAiOrderingConversationsCommands(
  actions: AiOrderingConversationsActions,
): AiOrderingConversationsCommands {
  return {
    clearConversation() {
      actions.detailCleared();
    },

    async loadConversations(storeId, query) {
      actions.loadStarted();

      try {
        const result = await merchantAiOrderingService.listConversations(
          storeId,
          query,
        );

        actions.listLoaded(result);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapMerchantApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },

    async loadConversation(storeId, conversationId) {
      actions.loadStarted();

      try {
        const detail = await merchantAiOrderingService.getConversation(
          storeId,
          conversationId,
        );

        actions.detailLoaded(detail);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapMerchantApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },
  };
}
