import { apiJson } from '@/api';
import { merchantStorePaths } from '@/api/paths/store.paths';
import { aiOrderingModel } from '@/models/aiOrdering';

import type {
  AiOrderingConversationDetail,
  AiOrderingConversationSummary,
  AiOrderingUnansweredEntry,
  AiOrderingUnansweredReason,
  GetAiOrderingConversationSuccessResponse,
  ListAiOrderingConversationsSuccessResponse,
  ListAiOrderingUnansweredSuccessResponse,
} from '@/models/aiOrdering';

type PageParams = { page?: number; pageSize?: number };

function pageQuery(params: PageParams): string {
  const search = new URLSearchParams();

  if (params.page !== undefined) search.set('page', String(params.page));
  if (params.pageSize !== undefined) {
    search.set('pageSize', String(params.pageSize));
  }

  return search.toString();
}

function withQuery(path: string, query: string): string {
  return query ? `${path}?${query}` : path;
}

export const merchantAiOrderingService = {
  async listConversations(
    storeId: string,
    params: PageParams = {},
  ): Promise<{
    conversations: AiOrderingConversationSummary[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const response = await apiJson<ListAiOrderingConversationsSuccessResponse>(
      withQuery(
        merchantStorePaths.aiOrderingConversations(storeId),
        pageQuery(params),
      ),
    );

    const { conversations, total, page, pageSize } = response.data;

    return {
      conversations: conversations.map(
        aiOrderingModel.deserializeConversationSummary,
      ),
      total,
      page,
      pageSize,
    };
  },

  async getConversation(
    storeId: string,
    conversationId: string,
  ): Promise<AiOrderingConversationDetail> {
    const response = await apiJson<GetAiOrderingConversationSuccessResponse>(
      merchantStorePaths.aiOrderingConversation(storeId, conversationId),
    );

    return aiOrderingModel.deserializeConversationDetail(
      response.data.conversation,
    );
  },

  async listUnanswered(
    storeId: string,
    params: PageParams & { reason?: AiOrderingUnansweredReason } = {},
  ): Promise<{
    entries: AiOrderingUnansweredEntry[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const search = new URLSearchParams(pageQuery(params));
    if (params.reason !== undefined) search.set('reason', params.reason);

    const response = await apiJson<ListAiOrderingUnansweredSuccessResponse>(
      withQuery(
        merchantStorePaths.aiOrderingUnanswered(storeId),
        search.toString(),
      ),
    );

    const { entries, total, page, pageSize } = response.data;

    return {
      entries: entries.map(aiOrderingModel.deserializeUnansweredEntry),
      total,
      page,
      pageSize,
    };
  },
};
