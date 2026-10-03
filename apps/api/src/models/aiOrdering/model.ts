import type {
  AiOrderingChoice,
  AiOrderingOperation,
  AiOrderingOperationResult,
  AiOrderingResponse,
} from '@repo/shared';

/**
 * Hard ceiling on turns in one conversation, enforced when appending.
 *
 * This is an abuse guard, not a rolling window: retention is the point of this
 * collection, so turns are never dropped to make room. Once a conversation hits
 * the ceiling, appends are refused. A real ordering conversation is well under
 * 20 turns.
 *
 * Separate from how many turns are SENT to the model, which the version config
 * caps and the rolling summary absorbs. Do not unify the two.
 */
export const AI_ORDERING_MAX_TURNS_PER_CONVERSATION = 50;

/**
 * A `choices` response the backend issued, stored so the next turn can resolve
 * `responseToPromptId` and `selectedOptionId` against the prompt that offered
 * them. Resolving from the guest's OWN conversation is what makes another
 * guest's prompt id structurally unreachable.
 */
export type AiOrderingPromptSnapshot = {
  promptId: string;
  question: string;
  options: AiOrderingChoice[];
};

/**
 * The decision a guest made on a proposal, and what came of it.
 *
 * `results` covers every operation in the proposal, including the dismissed ones
 * and the ones a failure stopped from being attempted. An operation with no
 * entry here would be an outcome the assistant has to infer from absence, which
 * is exactly what "you removed the tea" and "you moved on" must not collapse
 * into.
 */
export type AiOrderingProposalDecision = {
  decidedAt: Date;
  results: AiOrderingOperationResult[];
};

/**
 * A proposal the backend made, stored so a later decision can be matched to what
 * was actually proposed — and executed from, since the guest sends ids only.
 *
 * `decision` is the record that the proposal has been answered, and it is the
 * authority for single use: a second decision is refused because this field is
 * already set, not because the paused run is gone. The two must stay separable,
 * since "already decided" and "expired" are different things to tell a guest.
 */
export type AiOrderingProposalSnapshot = {
  proposalId: string;
  operations: AiOrderingOperation[];
  decision?: AiOrderingProposalDecision;
};

/**
 * Per-turn signals used to compare prompt and model versions. They are the
 * reason rejected output is stored at all: a version that needs repair often,
 * or whose operations get dismissed often, is a worse version, and that is only
 * visible in aggregate.
 */
export type AiOrderingTurnQualitySignals = {
  /** Whether validation failed and the model was given one chance to repair. */
  repairAttempted: boolean;
  /** Set only when a repair ran: whether the second attempt passed validation. */
  repairSucceeded?: boolean;
  /** Operations dropped after validation, including any surviving a failed repair. */
  droppedOperationCount: number;
  /** Operations that targeted another participant's item. Prompt-quality signal. */
  ownershipViolationCount: number;
  /** Provider-reported cached prompt tokens, so cache hit rate is measured. */
  cacheReadTokens?: number;
};

/**
 * One turn is one request/response round trip — what the guest sent and the
 * response the guest saw — not a role-tagged chat message, because a turn is
 * one request to one response.
 *
 * Every turn is recorded, including turns whose model output was rejected by
 * validation: those are the most valuable rows in the evaluation corpus.
 */
export type AiOrderingTurnSnapshot = {
  id: string;
  message: string;
  responseToPromptId?: string;
  selectedOptionId?: string;
  versionId: string;
  /**
   * Hash of the prompt and limits that produced this turn.
   *
   * `versionId` names the version; this names its CONTENT. A draft version's
   * file may be edited between two turns that both say `v1-2026-09-30`, and
   * without this the corpus could not tell them apart. For a stable version it
   * should never vary, and a test pins it.
   */
  versionFingerprint: string;
  /**
   * The provider route and the model, recorded together because they are one
   * choice and neither is implied by `versionId`.
   *
   * Without the provider, the same model reached through two routes is
   * indistinguishable in the corpus.
   */
  provider: string;
  modelName: string;
  /** Raw model output before validation, stored even when it was rejected. */
  modelOutput?: unknown;
  /** The response the guest actually saw. */
  response: AiOrderingResponse;
  /** Present only when `response.type` is `choices`. */
  prompt?: AiOrderingPromptSnapshot;
  /** Present only when `response.type` is `proposal`. */
  proposal?: AiOrderingProposalSnapshot;
  quality: AiOrderingTurnQualitySignals;
  createdAt: Date;
};

/**
 * One document per (storeId, cartId, participantId). In a shared cart each
 * participant has their own private conversation with the assistant.
 *
 * `organizationId` is carried for tenant provenance, matching `CartEntity` and
 * `OrderEntity`, which also store it without ever filtering on it. It costs
 * nothing here: the service already loads the store on every turn to resolve the
 * assistant setting and to build the menu context, so the organization id is
 * always in hand. It matters more on this collection than on a cart, because
 * conversations are deliberately retained for review and evaluation long after
 * the cart is gone.
 *
 * The conversation outlives its cart. Carts self-delete on a TTL index;
 * conversations must not, because retention for review and evaluation is the
 * point of this collection.
 */
export type AiOrderingConversationEntity = {
  id: string;
  organizationId: string;
  storeId: string;
  cartId: string;
  participantId: string;
  /** Rolling summary of turns before `summarizedUpToTurnIndex`, for model context only. */
  summary?: string;
  /** Exclusive index into `turns`: everything before it is covered by `summary`. */
  summarizedUpToTurnIndex?: number;
  turns: AiOrderingTurnSnapshot[];
  createdAt: Date;
  updatedAt: Date;
};
