/**
 * The merchant's read side of stored conversations.
 *
 * Separate from `aiOrdering.service.ts` because the two share nothing but the
 * collection: that one runs a guest turn against a provider under a rate limit
 * and a deadline, this one reads rows back. Keeping them apart means the review
 * surface cannot accidentally depend on the assistant being enabled — a merchant
 * must still be able to read what the assistant said last month after the
 * deployment turned it off.
 */

import {
  toAiOrderingConversationDetailDto,
  toAiOrderingConversationSummaryDto,
  toAiOrderingUnansweredEntryDtos,
} from '@src/models/aiOrdering/mapper';
import { aiOrderingRepository } from '@src/repositories/aiOrdering/repository';
import { ERROR_CODES } from '@src/utils/errorCode';
import { NotFoundError } from '@src/utils/errors';

import type {
  AiOrderingConversationDetailDto,
  AiOrderingConversationSummaryDto,
  AiOrderingUnansweredEntryDto,
  ListAiOrderingConversationsQuery,
  ListAiOrderingUnansweredQuery,
} from '@repo/shared';
import type { AiOrderingRepository } from '@src/repositories/aiOrdering/repository';

export type AiOrderingReviewServiceDeps = {
  repository: Pick<
    AiOrderingRepository,
    | 'listByStore'
    | 'countByStore'
    | 'findById'
    | 'listUnanswered'
    | 'countUnanswered'
  >;
};

export class AiOrderingReviewService {
  constructor(private readonly deps: AiOrderingReviewServiceDeps) {}

  public async listConversations(
    storeId: string,
    query: ListAiOrderingConversationsQuery,
  ): Promise<{
    conversations: AiOrderingConversationSummaryDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const skip = (query.page - 1) * query.pageSize;

    const [conversations, total] = await Promise.all([
      this.deps.repository.listByStore({
        storeId,
        skip,
        limit: query.pageSize,
      }),
      this.deps.repository.countByStore(storeId),
    ]);

    return {
      conversations: conversations.map(toAiOrderingConversationSummaryDto),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  public async getConversation(
    storeId: string,
    conversationId: string,
    viewer: { isSuperAdmin: boolean },
  ): Promise<AiOrderingConversationDetailDto> {
    const conversation = await this.deps.repository.findById({
      storeId,
      conversationId,
    });

    // The store id was part of the lookup, so a conversation belonging to
    // another store is indistinguishable here from one that does not exist —
    // which is the right answer to give either way.
    if (!conversation) {
      throw new NotFoundError(
        'Conversation not found',
        ERROR_CODES.AI_ORDERING_CONVERSATION_NOT_FOUND,
      );
    }

    return toAiOrderingConversationDetailDto(conversation, {
      // The full prompt opens with the platform's core instructions, which a
      // merchant's own staff are not shown.
      includePromptPreludes: viewer.isSuperAdmin,
    });
  }

  public async listUnanswered(
    storeId: string,
    query: ListAiOrderingUnansweredQuery,
  ): Promise<{
    entries: AiOrderingUnansweredEntryDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const skip = (query.page - 1) * query.pageSize;

    const [rows, total] = await Promise.all([
      this.deps.repository.listUnanswered({
        storeId,
        skip,
        limit: query.pageSize,
        ...(query.reason !== undefined ? { reason: query.reason } : {}),
      }),
      this.deps.repository.countUnanswered({
        storeId,
        ...(query.reason !== undefined ? { reason: query.reason } : {}),
      }),
    ]);

    // Each row is already one unanswered turn; the mapper is reused by handing
    // it a one-turn conversation so the entry shape is defined in exactly one
    // place.
    const entries = rows.flatMap((row) =>
      toAiOrderingUnansweredEntryDtos({
        id: row.conversationId,
        organizationId: '',
        storeId,
        cartId: '',
        participantId: row.participantId,
        turns: [row.turn],
        createdAt: row.turn.createdAt,
        updatedAt: row.turn.createdAt,
      }),
    );

    return { entries, total, page: query.page, pageSize: query.pageSize };
  }
}

export function createAiOrderingReviewService(
  deps: AiOrderingReviewServiceDeps = { repository: aiOrderingRepository },
) {
  return new AiOrderingReviewService(deps);
}

export const aiOrderingReviewService = createAiOrderingReviewService();
