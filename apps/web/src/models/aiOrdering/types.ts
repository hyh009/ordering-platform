import type {
  AiOrderingChoice,
  AiOrderingConversationDetailDto,
  AiOrderingGuestConversationDto,
  AiOrderingGuestTurnDto,
  AiOrderingConversationSummaryDto,
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
  AiOrderingPreviousOutcome,
  AiOrderingProposalResponse,
  AiOrderingResponse,
  AiOrderingResponseType,
  AiOrderingTurnResponseData,
  AiOrderingUnansweredReason,
  AiOrderingUnansweredResponse,
  SendAiOrderingMessageRequest,
  SendAiOrderingMessageSuccessResponse,
  GetAiOrderingConversationSuccessResponse,
  GetAiOrderingGuestConversationSuccessResponse,
  ListAiOrderingConversationsSuccessResponse,
  ListAiOrderingUnansweredSuccessResponse,
} from '@repo/shared';

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
  AiOrderingPreviousOutcome,
  AiOrderingResponseType,
  AiOrderingUnansweredReason,
  SendAiOrderingMessageRequest,
  SendAiOrderingMessageSuccessResponse,
};

export type AiOrderingChoiceDtoType = AiOrderingChoice;
export type AiOrderingResponseDtoType = AiOrderingResponse;
export type AiOrderingTurnDtoType = AiOrderingTurnResponseData;

export type AiOrderingChoiceModel = AiOrderingChoice;
export type AiOrderingOperationModel = AiOrderingOperation;
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
};

// ── Merchant review ──────────────────────────────────────────────────────────

export type AiOrderingConversationSummaryDtoType =
  AiOrderingConversationSummaryDto;
export type AiOrderingConversationDetailDtoType =
  AiOrderingConversationDetailDto;
export type AiOrderingReviewTurnDtoType = AiOrderingReviewTurnDto;
export type AiOrderingUnansweredEntryDtoType = AiOrderingUnansweredEntryDto;

export type AiOrderingConversationSummary = AiOrderingConversationSummaryDto;
export type AiOrderingReviewTurn = AiOrderingReviewTurnDto;
export type AiOrderingConversationDetail = AiOrderingConversationDetailDto;
export type AiOrderingUnansweredEntry = AiOrderingUnansweredEntryDto;
