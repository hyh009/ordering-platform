import { z } from 'zod';

import {
  cartItemInputSchema,
  cartItemParamsSchema,
  updateCartItemSchema,
} from './cart.js';

import type { ApiSuccessResponse } from './api.js';
import type { CartDto } from './cart.js';

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
 * What became of one proposed operation. Recorded when the outcome is
 * determined, not when the guest next speaks.
 *
 * Four ways not to end up in the cart, and they are deliberately not collapsed,
 * because each produces a different next reply and a different line in the
 * guest's transcript:
 *
 * - `rejected` — the guest unchecked the row before accepting. A refusal.
 * - `superseded` — the guest never answered; they sent another message and the
 *   proposal lapsed with it. Not a refusal: they may still want it.
 * - `no_action` — the guest accepted, but an earlier operation failed in a way
 *   that stopped the proposal before this one was attempted.
 * - `failed` — the guest accepted and it was attempted, but it did not apply.
 *
 * "You removed the tea", "you never answered", "we never got to it" and "it
 * would not go in" are four different things to say.
 */
export const aiOrderingOperationOutcomes = [
  'accepted',
  'rejected',
  'superseded',
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
  /**
   * Further questions asked in the same turn, each with its own options.
   *
   * A product often needs several choices at once — a drink's sugar, ice and
   * size — and asking them one turn at a time costs the guest a round trip per
   * choice. `question` and `options` above stay the first question, so a
   * single-question response is unchanged. With more than one, the guest picks
   * an option per question and answers them all in one message; that answer
   * travels as text, so `selectedOptionId` is only ever the first question's.
   */
  additionalQuestions: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(500),
        options: z.array(aiOrderingChoiceSchema).min(1).max(8),
      }),
    )
    .max(4)
    .optional(),
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

export const sendAiOrderingMessageSchema = z.object({
  message: z.string().trim().min(1).max(AI_ORDERING_MAX_MESSAGE_CHARACTERS),
  /** Set when answering a prior `choices` response. */
  responseToPromptId: aiOrderingIdSchema.optional(),
  /** Absent when the guest answered a `choices` response with free text. */
  selectedOptionId: aiOrderingIdSchema.optional(),
});

/**
 * The guest's decision on a pending proposal.
 *
 * Ids only, never operation content. The backend rebuilds what to execute from
 * the proposal it recorded, so a caller can neither add an operation the
 * assistant never proposed nor alter one it did. An empty list is a refusal of
 * the whole proposal, which is why there is no minimum.
 */
export const decideAiOrderingProposalSchema = z.object({
  proposalId: aiOrderingIdSchema,
  keptOperationIds: z
    .array(aiOrderingIdSchema)
    .max(AI_ORDERING_MAX_OPERATIONS_PER_PROPOSAL),
});

/**
 * What the server recorded for the proposal this message settled.
 *
 * Present only when the guest had an unanswered proposal open and sent another
 * message instead of answering it. Sending a message ends that proposal, and
 * this is the record of it ending — the panel marks those rows from this rather
 * than inferring them, because the server is the side that wrote the decision
 * and it may have lost the race to an acceptance landing in the same instant.
 */
export const aiOrderingSettledProposalSchema = z.object({
  proposalId: aiOrderingIdSchema,
  results: z.array(aiOrderingOperationResultSchema),
});

export const aiOrderingTurnResponseDataSchema = z.object({
  versionId: aiOrderingIdSchema,
  response: aiOrderingResponseSchema,
  settledProposal: aiOrderingSettledProposalSchema.optional(),
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
export type AiOrderingSettledProposal = z.infer<
  typeof aiOrderingSettledProposalSchema
>;
export type SendAiOrderingMessageRequest = z.infer<
  typeof sendAiOrderingMessageSchema
>;
export type DecideAiOrderingProposalRequest = z.infer<
  typeof decideAiOrderingProposalSchema
>;
export type AiOrderingTurnResponseData = z.infer<
  typeof aiOrderingTurnResponseDataSchema
>;

export type SendAiOrderingMessageSuccessResponse =
  ApiSuccessResponse<AiOrderingTurnResponseData>;

/**
 * What a decision produced.
 *
 * `results` covers EVERY operation in the proposal, including the ones the guest
 * dismissed and the ones a failure stopped from being attempted, so the client
 * and the assistant both read an outcome rather than inferring one from absence.
 *
 * `cart` is the cart as it stands after execution, returned here so the surface
 * unblocks on a cart the server confirmed rather than on a second read.
 *
 * `reply` is the assistant's answer to what actually happened. Optional because
 * the cart change is already committed when it is produced: a provider failure
 * at that point costs the closing sentence, never the result.
 */
export type AiOrderingProposalDecisionData = {
  proposalId: string;
  results: AiOrderingOperationResult[];
  cart: CartDto;
  reply?: string;
};

export type DecideAiOrderingProposalSuccessResponse =
  ApiSuccessResponse<AiOrderingProposalDecisionData>;

// ── Guest transcript ─────────────────────────────────────────────────────────
// What the guest is handed when the panel reopens. The conversation is stored
// server-side, so a reload used to leave the guest with a blank panel while the
// assistant kept reading the full history — an assistant remembering a
// conversation its guest could not see.
//
// Deliberately narrower than `AiOrderingReviewTurnDto` over the same stored
// turn: the fingerprint, provider, model name, and quality signals exist to tell
// a merchant why a prompt version needs work. None of that is the guest's
// business, so the two DTOs stay separate rather than one being reused with
// fields omitted at the edge.

/**
 * What became of a proposal, as the guest's restored transcript reports it.
 *
 * Two states, not three. An expired proposal is a decided one whose operations
 * are all `superseded`, so the client renders results in both cases and only
 * `pending` means there is still something to accept. That keeps "you already
 * answered this" and "this is still waiting for you" as the only distinction the
 * panel has to draw, which is the one the guest cares about.
 */
export type AiOrderingProposalStateDto =
  | { status: 'pending' }
  | {
      status: 'decided';
      decidedAt: string;
      results: AiOrderingOperationResult[];
    };

export type AiOrderingGuestTurnDto = {
  /** The stored turn id, so the transcript has stable React keys. */
  id: string;
  message: string;
  response: AiOrderingResponse;
  /** Present exactly when `response.type` is `proposal`. */
  proposal?: AiOrderingProposalStateDto;
  versionId: string;
  createdAt: string;
};

export type AiOrderingGuestConversationDto = {
  /** Empty before the guest's first turn. Never null: there is no "no conversation" state to branch on. */
  turns: AiOrderingGuestTurnDto[];
};

export type GetAiOrderingGuestConversationSuccessResponse =
  ApiSuccessResponse<AiOrderingGuestConversationDto>;

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
 * What the model actually answered, as the review surface reads it.
 *
 * The quality signals say THAT a turn was degraded; this says what the model
 * said. They are different questions, and only this one answers "it told the
 * guest it would add a note, so why is there no note" — which needed a direct
 * database read every time it came up.
 *
 * A deliberately narrow projection of the stored raw reply, not the reply
 * itself: the tool the model chose, the arguments it chose, and any plain text
 * beside them. `args` stays `unknown` because every tool has its own argument
 * shape and the reader renders them as JSON; the reader must not branch on
 * them. Absent when the turn stored nothing recognizable, which a pre-agent
 * turn or a future provider can produce — a shape this does not recognize is
 * omitted rather than passed through, so this field never becomes a hole in
 * the contract.
 */
export type AiOrderingModelOutputDto = {
  /** The tool the model called, if any. Empty for a plain-text answer. */
  toolCalls: { name: string; args: unknown }[];
  /** Text the model wrote alongside the call. Often empty. */
  text: string;
};

/**
 * How a turn was reached: the turn's own part of the prompt, then every model
 * call in order.
 *
 * A turn usually takes one call. More than one means the earlier answer could
 * not be used, and `feedback` on the later call is what the model was told
 * about it. The menu and the core instructions are not included: they are the
 * same on every turn and are not the merchant's to read.
 */
export type AiOrderingModelTraceDto = {
  /** The cart, the last proposal's outcome, and the guest's message, as sent. */
  currentTurn: string;
  /** The earlier turns and summary, as sent. Absent on older stored turns. */
  history?: string;
  /** Which prompt prelude opened this turn's prompt, when one was recorded. */
  preludeHash?: string;
  calls: {
    toolNames: string[];
    feedback?: string;
    output?: AiOrderingModelOutputDto;
    error?: string;
  }[];
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
  /**
   * Present when the stored raw reply was recognizable. Merchant-only: the
   * guest DTO carries no equivalent, because this is what the assistant tried
   * to do, not what the guest was told.
   */
  modelOutput?: AiOrderingModelOutputDto;
  /** Present on turns stored since the trace was recorded. Merchant-only. */
  modelTrace?: AiOrderingModelTraceDto;
  repairAttempted: boolean;
  repairSucceeded?: boolean;
  droppedOperationCount: number;
  ownershipViolationCount: number;
  createdAt: string;
};

/**
 * The unchanging opening of a prompt: core instructions, tool definitions, and
 * store data, each exactly as sent.
 *
 * It holds the assistant's core instructions, which are the platform's and not
 * a merchant's to read, so only the platform's own conversation read returns
 * these. The merchant's never does.
 */
export type AiOrderingPromptPreludeDto = {
  hash: string;
  coreInstructions: string;
  tools: string;
  storeData: string;
  createdAt: string;
};

export type AiOrderingConversationDetailDto = {
  id: string;
  storeId: string;
  cartId: string;
  participantId: string;
  summary?: string;
  turns: AiOrderingReviewTurnDto[];
  /** Present only on the platform read. See `AiOrderingPromptPreludeDto`. */
  promptPreludes?: AiOrderingPromptPreludeDto[];
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
