import { aiOrderingMongoRepository } from '@src/repositories/aiOrdering/mongo.repository';

import type {
  AiOrderingOperation,
  AiOrderingOperationResult,
  AiOrderingProposalResponse,
} from '@repo/shared';
import type {
  AiOrderingConversationEntity,
  AiOrderingPromptPrelude,
  AiOrderingProposalDecision,
  AiOrderingProposalSnapshot,
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

/**
 * A stored proposal, with the response that carried it.
 *
 * Both halves are needed to re-issue the proposal's tool call on a resume: the
 * snapshot holds the operations, and the response holds the reply and the
 * confirmation flag that were part of the same call. Returning only the snapshot
 * means rebuilding a PARTIAL set of arguments, which the interrupt rejects
 * silently — the tool simply never runs.
 */
export type AiOrderingStoredProposal = {
  snapshot: AiOrderingProposalSnapshot;
  response: AiOrderingProposalResponse;
};

export type FindAiOrderingProposalInput = {
  storeId: string;
  cartId: string;
  participantId: string;
  proposalId: string;
};

export type RecordAiOrderingProposalDecisionInput = {
  storeId: string;
  cartId: string;
  participantId: string;
  proposalId: string;
  decision: AiOrderingProposalDecision;
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
    /** Stored alongside when this turn's prompt opened with text not yet kept. */
    promptPrelude?: AiOrderingPromptPrelude,
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
  /**
   * One proposal from this guest's OWN conversation, or `null`.
   *
   * The participant triple is part of the filter rather than checked afterwards,
   * so another guest's proposal id is unreachable rather than fetched and then
   * rejected — the same rule `findById` follows for `storeId`.
   */
  findProposal(
    input: FindAiOrderingProposalInput,
  ): Promise<AiOrderingStoredProposal | null>;
  /**
   * Records a decision only if none is recorded yet, and reports whether this
   * caller is the one that recorded it.
   *
   * This is the single-use guarantee. It is a conditional write rather than a
   * read-then-write because two acceptances of one proposal can be in flight at
   * once, and both would pass a check. `claimed: false` with a proposal present
   * means someone else already decided it; a missing proposal is a different
   * answer, because expiry and a repeat decision are different things to tell a
   * guest.
   */
  recordProposalDecision(
    input: RecordAiOrderingProposalDecisionInput,
  ): Promise<{ claimed: boolean; proposal: AiOrderingStoredProposal | null }>;
  /**
   * Fills in the results of a decision that was already claimed.
   *
   * Claiming and reporting are two writes because they answer two questions at
   * two different moments: the claim settles WHO decides, before anything runs,
   * and this settles WHAT happened, after. Doing them as one write would mean
   * either executing before the claim — which lets two requests both apply — or
   * holding the claim open across the cart calls.
   *
   * `appliedOperations` goes in with the results, in the one update: a reader
   * must never find an accepted result beside the proposed version of an
   * operation the guest changed. The proposal's own `operations` is not
   * touched.
   */
  setProposalResults(input: SetAiOrderingProposalResultsInput): Promise<void>;
};

export type SetAiOrderingProposalResultsInput = {
  storeId: string;
  cartId: string;
  participantId: string;
  proposalId: string;
  results: AiOrderingOperationResult[];
  /** Left out when the guest changed nothing, so nothing is stored for it. */
  appliedOperations?: AiOrderingOperation[];
  /** What the assistant said about the decision. Left out when it said nothing. */
  reply?: string;
};

export type UpdateAiOrderingSummaryInput = {
  conversationId: string;
  summary: string;
  summarizedUpToTurnIndex: number;
};

export const aiOrderingRepository: AiOrderingRepository =
  aiOrderingMongoRepository;
