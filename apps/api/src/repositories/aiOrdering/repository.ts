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
};

export type UpdateAiOrderingSummaryInput = {
  conversationId: string;
  summary: string;
  summarizedUpToTurnIndex: number;
};

export const aiOrderingRepository: AiOrderingRepository =
  aiOrderingMongoRepository;
