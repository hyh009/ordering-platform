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
  'products',
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

/**
 * The most options one question may offer.
 *
 * Five, because a question is for choosing between a few readings of what the
 * guest said — which product list they meant is a `products` response now. The
 * bound is also a signal and not only a limit: the smaller it is, the sooner the
 * model meets the wall that says this is the wrong answer to be giving. At eight
 * it looked usable for a twelve-product menu, and the model duly offered eight
 * of the twelve.
 */
export const AI_ORDERING_MAX_CHOICE_OPTIONS = 5;

/**
 * The most products the model may name one by one.
 *
 * A hand-picked list is the model deciding what is relevant, and a long one is
 * evidence it has not decided. Past this it should be naming a category, which
 * is a closed set the merchant authored and is shown whole — twelve kinds of one
 * dish is exactly the case this bound must not truncate.
 */
export const AI_ORDERING_MAX_SHOWN_PRODUCTS = 8;

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
/**
 * One option the guest may pick for a choice on a proposed item.
 *
 * The label comes from the menu, localized by the backend, and never from the
 * model: it is menu data, so writing it is code's job. That is also what keeps
 * an internal id out of anything the guest reads.
 */
export const aiOrderingChoiceGroupOptionSchema = z.object({
  optionId: aiOrderingIdSchema,
  label: z.string().trim().min(1).max(120),
  /** Added to the item's price by picking this option. Zero when it is free. */
  priceAdjustment: z.number(),
});

/**
 * One choice a proposed item's product offers, with what is selected for it now.
 *
 * EVERY choice is carried, answered or not. It used to be only the unanswered
 * ones, which left a choice the assistant had filled in impossible to see or
 * correct: the guest's only way to change a sugar level they never asked for
 * was to argue with the assistant about it.
 *
 * Computed by the backend from the menu and the selections on the operation,
 * never declared by the model: "which choices exist and which are settled" is
 * derivable, so the model is not asked for it and cannot get it wrong. An
 * optional choice appears here too, which is what makes offering it structural
 * rather than a rule the model has to remember.
 */
export const aiOrderingChoiceGroupSchema = z.object({
  modifierId: aiOrderingIdSchema,
  /** The choice's name from the menu, localized. */
  label: z.string().trim().min(1).max(120),
  /**
   * Whether the guest has to answer this one before the proposal can be
   * applied. False for an optional choice, which may be left unanswered.
   */
  isRequired: z.boolean(),
  /** How many options may be picked. `maxSelect` is 1 for a plain choice. */
  minSelect: z.number().int().min(0),
  maxSelect: z.number().int().min(1),
  /** What the guest may pick. Sold-out options are left out. */
  options: z.array(aiOrderingChoiceGroupOptionSchema).min(1),
  /**
   * What is selected for this choice as the operation stands. Empty when
   * nothing is, which for a required choice means the guest still has to answer.
   */
  selectedOptionIds: z.array(aiOrderingIdSchema),
});

export const aiOrderingOperationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('add_item'),
    operationId: aiOrderingIdSchema,
    summary: aiOrderingSummarySchema,
    item: cartItemInputSchema,
    /** Every choice the product offers. Absent when it offers none. */
    choices: z.array(aiOrderingChoiceGroupSchema).optional(),
    /**
     * `summary` with the choices left out, present together with `choices`.
     *
     * For a surface that shows the choices itself and lets the guest change
     * them: `summary` names the options the assistant proposed, so beside an
     * edited choice it would say one thing while the card says another.
     */
    summaryWithoutChoices: aiOrderingSummarySchema.optional(),
  }),
  z.object({
    type: z.literal('update_own_item'),
    operationId: aiOrderingIdSchema,
    summary: aiOrderingSummarySchema,
    itemId: cartItemParamsSchema.shape.itemId,
    item: updateCartItemSchema,
    /** Every choice the product offers. Absent when it offers none. */
    choices: z.array(aiOrderingChoiceGroupSchema).optional(),
    /**
     * `summary` with the choices left out, present together with `choices`.
     *
     * For a surface that shows the choices itself and lets the guest change
     * them: `summary` names the options the assistant proposed, so beside an
     * edited choice it would say one thing while the card says another.
     */
    summaryWithoutChoices: aiOrderingSummarySchema.optional(),
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
  /**
   * The answers offered, for ONE question. A turn never asks two.
   *
   * Carrying further questions here was tried and removed. It was meant to
   * collect a drink's sugar, ice and size in one turn, but a later rule sends
   * every unstated modifier choice to the proposal page instead, so the case it
   * existed for no longer reaches this response at all. What it did carry was a
   * second slot the model used to PAGINATE: too many products to fit in eight
   * options, so the rest went in a second question. The guest was then asked to
   * answer both, and two answers travelling as one text message ordered two
   * products when they wanted one. A cap on a list is a reason to stop listing,
   * never a reason to open a second list — see `ask_choices` for what to do
   * instead.
   */
  options: z
    .array(aiOrderingChoiceSchema)
    .min(1)
    .max(AI_ORDERING_MAX_CHOICE_OPTIONS),
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
   *
   * It does not override `choices`. An operation with a required choice still
   * unanswered cannot be applied until the guest answers it, however this is
   * set — the server refuses it — so a client that applies immediately still
   * has to collect those answers first.
   */
  confirmationRequired: z.boolean(),
  operations: z
    .array(aiOrderingOperationSchema)
    .min(1)
    .max(AI_ORDERING_MAX_OPERATIONS_PER_PROPOSAL),
});

/**
 * Products put in front of the guest to look at. Changes nothing.
 *
 * The assistant could ask, propose or refuse, but it could not SHOW — so every
 * request to see what a store offers was forced into a tool built for something
 * else, and both failures looked the same from here: twelve kinds of one dish
 * split across two questions, and two products matching one name BOTH added to
 * the cart because proposing was the only way to put two things on screen.
 *
 * Ids only. The client is already holding the menu these came from, so anything
 * the model wrote about a product would at best agree with it and at worst
 * contradict it on a price. A reason for showing these belongs in `reply`, where
 * the guest reads it as the assistant speaking rather than as product data.
 *
 * `categoryId` is where the set came from, when it is a whole category. A
 * category is shown whole; only a hand-picked list is bounded.
 */
export const aiOrderingProductsResponseSchema = z.object({
  type: z.literal('products'),
  reply: aiOrderingReplySchema,
  productIds: z.array(aiOrderingIdSchema).min(1),
  categoryId: aiOrderingIdSchema.optional(),
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
  aiOrderingProductsResponseSchema,
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
  /**
   * The answers the guest gave on the proposal card: a choice that was left
   * open, filled in, or one the assistant had answered, changed.
   *
   * This does not weaken the rule above. A caller still cannot add an operation
   * or alter one freely: it can only answer a choice the server itself listed
   * on that operation, and only from the options the server itself sent. Each
   * entry is checked against the `choices` recorded with that proposal, so an
   * id that was never offered is rejected the same way an invented operation
   * would be.
   *
   * An answer REPLACES whatever was selected for that choice. An empty answer
   * therefore clears it, which is how a guest declines an optional extra the
   * assistant added on their behalf.
   */
  resolvedChoices: z
    .array(
      z.object({
        operationId: aiOrderingIdSchema,
        modifierId: aiOrderingIdSchema,
        optionIds: z.array(aiOrderingIdSchema).max(10),
      }),
    )
    .max(40)
    .optional(),
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
export type AiOrderingChoiceGroup = z.infer<typeof aiOrderingChoiceGroupSchema>;
export type AiOrderingChoiceGroupOption = z.infer<
  typeof aiOrderingChoiceGroupOptionSchema
>;
export type AiOrderingOperation = z.infer<typeof aiOrderingOperationSchema>;
export type AiOrderingMessageResponse = z.infer<
  typeof aiOrderingMessageResponseSchema
>;
export type AiOrderingChoicesResponse = z.infer<
  typeof aiOrderingChoicesResponseSchema
>;
export type AiOrderingProductsResponse = z.infer<
  typeof aiOrderingProductsResponseSchema
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
  /** Present when the guest changed a choice. See `AiOrderingAppliedSummary`. */
  appliedSummaries?: AiOrderingAppliedSummary[];
  cart: CartDto;
  reply?: string;
};

/**
 * The line for an operation the guest changed before accepting, as applied.
 *
 * The proposal the guest already holds names the options the assistant chose.
 * Once it is decided the record should read as what was ordered, so the
 * operations that differ come back described again. Only those: an operation
 * nobody changed is still described correctly by its own `summary`.
 *
 * A line and not the operation, because the guest's side only prints it — and
 * unlike the review surface it is not told what was proposed instead, which is
 * of no use to the person who made the change.
 */
export type AiOrderingAppliedSummary = {
  operationId: string;
  summary: string;
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
      /** Present when the guest changed a choice before accepting. */
      appliedSummaries?: AiOrderingAppliedSummary[];
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
 * One proposed operation the guest corrected before accepting it.
 *
 * Both lines, side by side, because the difference is the finding: a turn that
 * carries one is a turn where the assistant got a choice wrong. Summaries
 * rather than operations — the reviewer reads what changed, and the ids are in
 * the model output for whoever needs them.
 */
export type AiOrderingGuestAdjustmentDto = {
  operationId: string;
  /** The operation as the assistant proposed it. */
  proposed: string;
  /** The operation as it was applied to the cart. */
  applied: string;
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
  /**
   * Present when the guest changed a proposed operation's choices before
   * accepting it. `response` still carries the operations as the assistant
   * proposed them; this is what was applied instead.
   */
  guestAdjustments?: AiOrderingGuestAdjustmentDto[];
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
