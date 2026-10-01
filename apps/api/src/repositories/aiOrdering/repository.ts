import { aiOrderingMongoRepository } from '@src/repositories/aiOrdering/mongo.repository';

import type {
  AiOrderingConversationEntity,
  AiOrderingTurnSnapshot,
} from '@src/models/aiOrdering/model';

export type FindAiOrderingConversationInput = {
  storeId: string;
  cartId: string;
  participantId: string;
};

export type CreateAiOrderingConversationInput = {
  organizationId: string;
  storeId: string;
  cartId: string;
  participantId: string;
};

export type ListAiOrderingConversationsInput = {
  storeId: string;
  skip: number;
  limit: number;
};

export type FindAiOrderingConversationByIdInput = {
  storeId: string;
  conversationId: string;
};

export type ListAiOrderingUnansweredInput = {
  storeId: string;
  skip: number;
  limit: number;
  reason?: string;
};

export type AiOrderingUnansweredRow = {
  conversationId: string;
  participantId: string;
  turn: AiOrderingTurnSnapshot;
};

export type AiOrderingRepository = {
  /**
   * The one conversation for this guest's (storeId, cartId, participantId).
   * Every turn starts here, and resolving a prompt or proposal id from the
   * guest's OWN conversation is what makes another guest's ids unreachable.
   */
  findByParticipant(
    input: FindAiOrderingConversationInput,
  ): Promise<AiOrderingConversationEntity | null>;
  create(
    input: CreateAiOrderingConversationInput,
  ): Promise<AiOrderingConversationEntity>;
  /**
   * Appends one turn. Returns `null` when the conversation does not exist.
   *
   * Throws when the conversation exists but has already reached
   * `AI_ORDERING_MAX_TURNS_PER_CONVERSATION`. That ceiling is an abuse guard,
   * not a rolling window: stored turns are never dropped to make room, because
   * retention is the point of this collection.
   */
  appendTurn(
    conversationId: string,
    turn: AiOrderingTurnSnapshot,
  ): Promise<AiOrderingConversationEntity | null>;
  /**
   * Replaces the rolling summary and the index it covers up to.
   *
   * A replacement, not an append: the summary is always rebuilt from the original
   * turns, so the previous value carries no information the new one lacks.
   * Returns `null` when the conversation no longer exists.
   */
  updateSummary(
    input: UpdateAiOrderingSummaryInput,
  ): Promise<AiOrderingConversationEntity | null>;
  /** Newest first. The merchant list reads this; guests never do. */
  listByStore(
    input: ListAiOrderingConversationsInput,
  ): Promise<AiOrderingConversationEntity[]>;
  countByStore(storeId: string): Promise<number>;
  /**
   * `storeId` is part of the filter, not checked afterwards, so a conversation
   * id from another store resolves to `null` rather than to a document the
   * caller then has to remember to reject.
   */
  findById(
    input: FindAiOrderingConversationByIdInput,
  ): Promise<AiOrderingConversationEntity | null>;
  /**
   * Unanswered turns across the store, one row per TURN rather than per
   * conversation, so the merchant's list paginates over the thing they are
   * reading. Newest first.
   */
  listUnanswered(
    input: ListAiOrderingUnansweredInput,
  ): Promise<AiOrderingUnansweredRow[]>;
  countUnanswered(input: { storeId: string; reason?: string }): Promise<number>;
};

export type UpdateAiOrderingSummaryInput = {
  conversationId: string;
  summary: string;
  summarizedUpToTurnIndex: number;
};

export const aiOrderingRepository: AiOrderingRepository =
  aiOrderingMongoRepository;
