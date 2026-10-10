import type {
  AiOrderingChoice,
  AiOrderingChoiceGroup,
  AiOrderingChoiceGroupOption,
  AiOrderingConversationDetailDto,
  AiOrderingGuestConversationDto,
  AiOrderingGuestTurnDto,
  AiOrderingConversationSummaryDto,
  AiOrderingModelOutputDto,
  AiOrderingReviewTurnDto,
  AiOrderingUnansweredEntryDto,
  ListAiOrderingConversationsQuery,
  ListAiOrderingUnansweredQuery,
  AiOrderingChoiceInputMode,
  AiOrderingChoicesResponse,
  AiOrderingMessageResponse,
  AiOrderingOperation,
  AiOrderingOperationOutcome,
  AiOrderingOperationResult,
  AiOrderingProposalResponse,
  AiOrderingProposalDecisionData,
  AiOrderingProposalStateDto,
  DecideAiOrderingProposalRequest,
  DecideAiOrderingProposalSuccessResponse,
  AiOrderingResponse,
  AiOrderingResponseType,
  AiOrderingSettledProposal,
  AiOrderingSettledShownSet,
  AiOrderingShownSetOutcome,
  AiOrderingShownSetStateDto,
  AiOrderingTurnResponseData,
  PickAiOrderingShownProductRequest,
  PickAiOrderingShownProductSuccessResponse,
  AiOrderingUnansweredReason,
  AiOrderingUnansweredResponse,
  SendAiOrderingMessageRequest,
  SendAiOrderingMessageSuccessResponse,
  GetAiOrderingConversationSuccessResponse,
  GetAiOrderingGuestConversationSuccessResponse,
  ListAiOrderingConversationsSuccessResponse,
  ListAiOrderingUnansweredSuccessResponse,
} from '@repo/shared';

import type { Cart } from '@/models/cart';

export type {
  GetAiOrderingConversationSuccessResponse,
  GetAiOrderingGuestConversationSuccessResponse,
  ListAiOrderingConversationsSuccessResponse,
  ListAiOrderingUnansweredSuccessResponse,
  ListAiOrderingConversationsQuery,
  ListAiOrderingUnansweredQuery,
  AiOrderingChoiceInputMode,
  AiOrderingOperationOutcome,
  AiOrderingOperationResult,
  AiOrderingResponseType,
  AiOrderingUnansweredReason,
  SendAiOrderingMessageRequest,
  SendAiOrderingMessageSuccessResponse,
  DecideAiOrderingProposalRequest,
  DecideAiOrderingProposalSuccessResponse,
  PickAiOrderingShownProductRequest,
  PickAiOrderingShownProductSuccessResponse,
};

export type { AiOrderingSettledProposal, AiOrderingSettledShownSet };
export type { AiOrderingShownSetOutcome };

export type AiOrderingChoiceDtoType = AiOrderingChoice;
export type AiOrderingResponseDtoType = AiOrderingResponse;
export type AiOrderingTurnDtoType = AiOrderingTurnResponseData;

export type AiOrderingChoiceModel = AiOrderingChoice;
export type AiOrderingOperationModel = AiOrderingOperation;
export type AiOrderingChoiceGroupModel = AiOrderingChoiceGroup;
export type AiOrderingChoiceGroupOptionModel = AiOrderingChoiceGroupOption;
export type AiOrderingMessageModel = AiOrderingMessageResponse;
export type AiOrderingChoicesModel = AiOrderingChoicesResponse;
export type AiOrderingProposalModel = AiOrderingProposalResponse;
export type AiOrderingUnansweredModel = AiOrderingUnansweredResponse;
export type AiOrderingResponseModel = AiOrderingResponse;

/**
 * One assistant answer plus the version that produced it.
 *
 * The version id travels with every turn rather than being read once per
 * session: the merchant review surface compares turns across versions, and a
 * deployment can change the active version between two turns of the same
 * conversation.
 */
export type AiOrderingTurn = {
  versionId: string;
  response: AiOrderingResponseModel;
  /**
   * The proposal this message ended, if the guest had one open.
   *
   * Sending a message ends an unanswered proposal. The panel has no other way
   * to learn that: nothing happened on the client, the guest simply typed. Only
   * the server knows whether its write won — an acceptance can land in the same
   * instant — so this comes back from the turn rather than being inferred.
   */
  settledProposal?: AiOrderingSettledProposal;
  /**
   * What the server recorded for the shown set this turn ended.
   *
   * The same argument as `settledProposal`, for the surface the guest was
   * looking at: a tap and a typed answer both end a standing set, and only the
   * server knows which it decided this was.
   */
  settledShownSet?: AiOrderingSettledShownSet;
};

export type AiOrderingGuestTurnDtoType = AiOrderingGuestTurnDto;
export type AiOrderingGuestConversationDtoType = AiOrderingGuestConversationDto;

/**
 * One exchange from the guest's own stored transcript.
 *
 * A superset of `AiOrderingTurn`: the live send path answers with just the
 * assistant's half, because the client already has the message it sent. A
 * transcript read has to carry the guest's message too, and an id, because the
 * panel is rebuilding both sides of a conversation it no longer remembers.
 */
export type AiOrderingTranscriptTurn = AiOrderingTurn & {
  id: string;
  message: string;
  createdAt: string;
  /**
   * Present exactly when the turn carried a proposal.
   *
   * Without it a reloaded panel cannot tell an applied proposal from one still
   * waiting, and would have to guess — which is how a guest ends up being told
   * to ask again for something already in their cart.
   */
  proposal?: AiOrderingProposalState;
  /**
   * Present exactly when the turn showed products carrying a set id.
   *
   * Without it a reloaded panel cannot tell a set already picked from one still
   * waiting to be — the same hole the proposal state closed, on the surface
   * where the guest taps.
   */
  shownSet?: AiOrderingShownSetState;
};

/** Two states. An expired proposal is a decided one whose rows are all no-action. */
export type AiOrderingProposalState = AiOrderingProposalStateDto;

/**
 * Pending, or settled with a named outcome.
 *
 * The settled cases are not collapsed the way a proposal's are: a proposal has
 * rows carrying outcomes, and a shown set has none.
 */
export type AiOrderingShownSetState = AiOrderingShownSetStateDto;

/** One operation the guest changed before accepting, described as applied. */
export type AiOrderingAppliedSummaryModel = {
  operationId: string;
  summary: string;
};

/** What a decision produced, as the wire carries it. */
export type AiOrderingProposalDecision = AiOrderingProposalDecisionData;

/** The same, with the cart mapped through the cart model. */
export type AiOrderingProposalDecisionResult = {
  proposalId: string;
  results: AiOrderingOperationResult[];
  /** The lines of the operations the guest changed, as applied. */
  appliedSummaries?: AiOrderingAppliedSummaryModel[];
  cart: Cart;
  /** Absent when the closing model call failed; the cart change still happened. */
  reply?: string;
};

// ── Merchant review ──────────────────────────────────────────────────────────

export type AiOrderingConversationSummaryDtoType =
  AiOrderingConversationSummaryDto;
export type AiOrderingConversationDetailDtoType =
  AiOrderingConversationDetailDto;
export type AiOrderingReviewTurnDtoType = AiOrderingReviewTurnDto;
export type AiOrderingUnansweredEntryDtoType = AiOrderingUnansweredEntryDto;

export type AiOrderingConversationSummary = AiOrderingConversationSummaryDto;

/**
 * What the model answered on a turn, for the review surface only.
 *
 * `args` stays `unknown`: the review surface renders it as JSON and must not
 * branch on a tool's argument shape, which is the backend's contract with the
 * model and changes with it.
 */
export type AiOrderingModelOutput = AiOrderingModelOutputDto;
export type AiOrderingReviewTurn = AiOrderingReviewTurnDto;
export type AiOrderingConversationDetail = AiOrderingConversationDetailDto;
export type AiOrderingUnansweredEntry = AiOrderingUnansweredEntryDto;
