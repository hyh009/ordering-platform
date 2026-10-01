import { z } from 'zod';

import {
  cartItemInputSchema,
  cartItemParamsSchema,
  updateCartItemSchema,
} from './cart.js';

import type { ApiSuccessResponse } from './api.js';

export const aiOrderingResponseTypes = [
  'message',
  'choices',
  'proposal',
  'unanswered',
] as const;

export const aiOrderingChoiceInputModes = ['single_choice', 'yes_no'] as const;

/**
 * Why the assistant could not answer. An enum rather than model prose so the
 * client and the merchant review surface branch on a stable value.
 * `missing_product_info` is the one that turns the conversation log into a list
 * of products the merchant should describe better.
 */
export const aiOrderingUnansweredReasons = [
  'missing_product_info',
  'out_of_scope',
  'unclear_request',
] as const;

/**
 * What became of one proposed operation. Reported on the guest's NEXT turn.
 *
 * `rejected` (the guest dismissed the row) and `no_action` (the guest typed
 * something else and the proposal expired) must stay distinct: "you removed the
 * tea" and "you moved on" should not produce the same reply. `failed` (accepted
 * but rejected on execution) is distinct from both.
 */
export const aiOrderingOperationOutcomes = [
  'accepted',
  'rejected',
  'no_action',
  'failed',
] as const;

export type AiOrderingResponseType = (typeof aiOrderingResponseTypes)[number];
export type AiOrderingChoiceInputMode =
  (typeof aiOrderingChoiceInputModes)[number];
export type AiOrderingUnansweredReason =
  (typeof aiOrderingUnansweredReasons)[number];
export type AiOrderingOperationOutcome =
  (typeof aiOrderingOperationOutcomes)[number];

const aiOrderingIdSchema = z.string().trim().min(1).max(120);
const aiOrderingReplySchema = z.string().trim().min(1).max(1000);
const aiOrderingSummarySchema = z.string().trim().min(1).max(240);

export const AI_ORDERING_MAX_OPERATIONS_PER_PROPOSAL = 10;
export const AI_ORDERING_MAX_MESSAGE_CHARACTERS = 1000;

export const aiOrderingChoiceSchema = z.object({
  id: aiOrderingIdSchema,
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240).optional(),
});

/**
 * Proposal operations reuse the cart's own request schemas instead of restating
 * their fields. An assistant proposal is then just a second way to produce a
 * cart request, beside the product configuration sheet, and the model contract
 * cannot drift from what the cart actually accepts. Adding a field here that the
 * cart cannot express is the signal that the design needs revisiting.
 *
 * `type` is the first property of every variant so an incremental parser can
 * identify the shape before the rest arrives.
 */
export const aiOrderingOperationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('add_item'),
    operationId: aiOrderingIdSchema,
    summary: aiOrderingSummarySchema,
    item: cartItemInputSchema,
  }),
  z.object({
    type: z.literal('update_own_item'),
    operationId: aiOrderingIdSchema,
    summary: aiOrderingSummarySchema,
    itemId: cartItemParamsSchema.shape.itemId,
    item: updateCartItemSchema,
  }),
  z.object({
    type: z.literal('remove_own_item'),
    operationId: aiOrderingIdSchema,
    summary: aiOrderingSummarySchema,
    itemId: cartItemParamsSchema.shape.itemId,
  }),
]);

export const aiOrderingMessageResponseSchema = z.object({
  type: z.literal('message'),
  reply: aiOrderingReplySchema,
});

export const aiOrderingChoicesResponseSchema = z.object({
  type: z.literal('choices'),
  reply: aiOrderingReplySchema,
  promptId: aiOrderingIdSchema,
  question: z.string().trim().min(1).max(500),
  inputMode: z.enum(aiOrderingChoiceInputModes),
  options: z.array(aiOrderingChoiceSchema).min(1).max(8),
  // Always true: a guest may answer by typing instead of picking an option.
  allowFreeText: z.literal(true),
});

export const aiOrderingProposalResponseSchema = z.object({
  type: z.literal('proposal'),
  reply: aiOrderingReplySchema,
  proposalId: aiOrderingIdSchema,
  /**
   * Resolved server-side from the store setting AND the active version's own
   * permission. The client renders dismiss and apply controls when true, and
   * applies immediately when false; it never resolves this itself.
   */
  confirmationRequired: z.boolean(),
  operations: z
    .array(aiOrderingOperationSchema)
    .min(1)
    .max(AI_ORDERING_MAX_OPERATIONS_PER_PROPOSAL),
});

export const aiOrderingUnansweredResponseSchema = z.object({
  type: z.literal('unanswered'),
  reply: aiOrderingReplySchema,
  reason: z.enum(aiOrderingUnansweredReasons),
  /** Present when `reason` is `missing_product_info` and the product is known. */
  productId: aiOrderingIdSchema.optional(),
});

export const aiOrderingResponseSchema = z.discriminatedUnion('type', [
  aiOrderingMessageResponseSchema,
  aiOrderingChoicesResponseSchema,
  aiOrderingProposalResponseSchema,
  aiOrderingUnansweredResponseSchema,
]);

export const aiOrderingOperationResultSchema = z.object({
  operationId: aiOrderingIdSchema,
  outcome: z.enum(aiOrderingOperationOutcomes),
  /** Set only when `outcome` is `failed`; a stable code, never raw error text. */
  failureCode: z.string().trim().min(1).max(120).optional(),
});

/**
 * What became of the previous proposal, reported on the next turn. Only
 * rejections and failures carry information the cart state does not already
 * show, but every listed operation is reported so the assistant never has to
 * infer an outcome from absence.
 */
export const aiOrderingPreviousOutcomeSchema = z.object({
  proposalId: aiOrderingIdSchema,
  results: z
    .array(aiOrderingOperationResultSchema)
    .min(1)
    .max(AI_ORDERING_MAX_OPERATIONS_PER_PROPOSAL),
});

export const sendAiOrderingMessageSchema = z.object({
  message: z.string().trim().min(1).max(AI_ORDERING_MAX_MESSAGE_CHARACTERS),
  /** Set when answering a prior `choices` response. */
  responseToPromptId: aiOrderingIdSchema.optional(),
  /** Absent when the guest answered a `choices` response with free text. */
  selectedOptionId: aiOrderingIdSchema.optional(),
  previousOutcome: aiOrderingPreviousOutcomeSchema.optional(),
});

export const aiOrderingTurnResponseDataSchema = z.object({
  versionId: aiOrderingIdSchema,
  response: aiOrderingResponseSchema,
});

export type AiOrderingChoice = z.infer<typeof aiOrderingChoiceSchema>;
export type AiOrderingOperation = z.infer<typeof aiOrderingOperationSchema>;
export type AiOrderingMessageResponse = z.infer<
  typeof aiOrderingMessageResponseSchema
>;
export type AiOrderingChoicesResponse = z.infer<
  typeof aiOrderingChoicesResponseSchema
>;
export type AiOrderingProposalResponse = z.infer<
  typeof aiOrderingProposalResponseSchema
>;
export type AiOrderingUnansweredResponse = z.infer<
  typeof aiOrderingUnansweredResponseSchema
>;
export type AiOrderingResponse = z.infer<typeof aiOrderingResponseSchema>;
export type AiOrderingOperationResult = z.infer<
  typeof aiOrderingOperationResultSchema
>;
export type AiOrderingPreviousOutcome = z.infer<
  typeof aiOrderingPreviousOutcomeSchema
>;
export type SendAiOrderingMessageRequest = z.infer<
  typeof sendAiOrderingMessageSchema
>;
export type AiOrderingTurnResponseData = z.infer<
  typeof aiOrderingTurnResponseDataSchema
>;

export type SendAiOrderingMessageSuccessResponse =
  ApiSuccessResponse<AiOrderingTurnResponseData>;

// ── Merchant review ──────────────────────────────────────────────────────────
// The backstage view of stored conversations. Read-only: nothing here lets a
// merchant edit a turn, because the corpus is evidence of what the assistant
// actually said.

export const aiOrderingConversationParamsSchema = z.object({
  storeId: z.string().trim().min(1),
  conversationId: aiOrderingIdSchema,
});

export const listAiOrderingConversationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const listAiOrderingUnansweredQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  reason: z.enum(aiOrderingUnansweredReasons).optional(),
});

/**
 * A conversation as the list shows it.
 *
 * `unansweredCount` is on the summary rather than left to the detail view
 * because it is what a merchant scans the list FOR: a conversation full of
 * questions the assistant could not answer is the one worth opening.
 */
export type AiOrderingConversationSummaryDto = {
  id: string;
  cartId: string;
  participantId: string;
  turnCount: number;
  unansweredCount: number;
  lastTurnAt?: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * One stored turn, as the merchant sees it.
 *
 * `versionFingerprint` travels with `versionId` because a draft version's file
 * may be edited between two turns that share an id.
 *
 * Quality signals are exposed rather than kept internal: a turn whose output was
 * repaired, or whose operations were dropped, is the evidence that a prompt
 * version needs work, and hiding it would leave the review surface unable to
 * show why.
 */
export type AiOrderingReviewTurnDto = {
  id: string;
  message: string;
  response: AiOrderingResponse;
  versionId: string;
  versionFingerprint: string;
  provider: string;
  modelName: string;
  repairAttempted: boolean;
  repairSucceeded?: boolean;
  droppedOperationCount: number;
  ownershipViolationCount: number;
  createdAt: string;
};

export type AiOrderingConversationDetailDto = {
  id: string;
  storeId: string;
  cartId: string;
  participantId: string;
  summary?: string;
  turns: AiOrderingReviewTurnDto[];
  createdAt: string;
  updatedAt: string;
};

/**
 * One question the assistant could not answer, flattened out of its turn.
 *
 * `productId` is present only when the reason is `missing_product_info` and the
 * assistant could name the product. Those entries are the actionable ones: they
 * are a list of products whose description is not good enough.
 */
export type AiOrderingUnansweredEntryDto = {
  conversationId: string;
  turnId: string;
  participantId: string;
  message: string;
  reply: string;
  reason: AiOrderingUnansweredReason;
  productId?: string;
  createdAt: string;
};

export type AiOrderingConversationParams = z.infer<
  typeof aiOrderingConversationParamsSchema
>;
export type ListAiOrderingConversationsQuery = z.infer<
  typeof listAiOrderingConversationsQuerySchema
>;
export type ListAiOrderingUnansweredQuery = z.infer<
  typeof listAiOrderingUnansweredQuerySchema
>;

export type ListAiOrderingConversationsSuccessResponse = ApiSuccessResponse<{
  conversations: AiOrderingConversationSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
}>;

export type GetAiOrderingConversationSuccessResponse = ApiSuccessResponse<{
  conversation: AiOrderingConversationDetailDto;
}>;

export type ListAiOrderingUnansweredSuccessResponse = ApiSuccessResponse<{
  entries: AiOrderingUnansweredEntryDto[];
  total: number;
  page: number;
  pageSize: number;
}>;
