import { merchantAiOrderingService } from '@/services/aiOrderingReview.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';

import type { AiOrderingUnansweredReason } from '@/models/aiOrdering';
import type { AiOrderingUnansweredActions } from './actions';

export type AiOrderingUnansweredCommands = {
  loadUnanswered(
    storeId: string,
    query: {
      page?: number;
      pageSize?: number;
      reason?: AiOrderingUnansweredReason;
    },
  ): Promise<{ status: 'loaded' } | MerchantCommandFailure>;
};

export function createAiOrderingUnansweredCommands(
  actions: AiOrderingUnansweredActions,
): AiOrderingUnansweredCommands {
  return {
    async loadUnanswered(storeId, query) {
      actions.loadStarted();

      try {
        const result = await merchantAiOrderingService.listUnanswered(
          storeId,
          query,
        );

        actions.loaded({ ...result, reason: query.reason ?? null });
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapMerchantApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },
  };
}
