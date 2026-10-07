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

/** One model call within a turn: what was added for it, and what came back. */
export type AiOrderingModelCallRecord = {
  /** The tools bound for this call. The closing call has no proposal tool. */
  toolNames: string[];
  /** What the model was told was wrong with its previous call. Absent on the first. */
  feedback?: string;
  /** Absent when the call failed before returning anything. */
  output?: { toolCalls: { name: string; args: unknown }[]; text: string };
  /** Why the call returned nothing: a provider error or a timeout. */
  error?: string;
};

export type AiOrderingModelTrace = {
  /** The `current_turn` block as sent: cart, last proposal's outcome, message. */
  currentTurn: string;
  /** The `history` block as sent: the summary and the earlier turns in window. */
  history?: string;
  /** Which of the conversation's `promptPreludes` opened this turn's prompt. */
  preludeHash?: string;
  calls: AiOrderingModelCallRecord[];
};

/**
 * The part of the prompt that does not change from turn to turn: the core
 * instructions, the tool definitions, and the store data.
 *
 * Stored once per conversation, and again only if it changes mid-conversation —
 * a menu edit, or a draft version's file being edited. Together with a turn's
 * `modelTrace` it is the whole prompt that turn sent, without repeating the
 * bulk of it fifty times.
 */
export type AiOrderingPromptPrelude = {
  /** Identifies this exact text; a turn's trace points at it. */
  hash: string;
  coreInstructions: string;
  /** Every tool as the provider was shown it: name, description, parameters. */
  tools: string;
  storeData: string;
  createdAt: Date;
};

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
  /**
   * Set when the conversation moved on instead of the guest answering.
   *
   * A proposal is good for the turn that made it. Sending another message
   * settles the old one as `superseded` so it can no longer be applied — a guest
   * who kept talking for ten turns must not be able to accept something the
   * assistant offered at the start, against a cart and a menu that have both
   * changed since.
   *
   * Distinct from a decision the guest made, even though both are decisions and
   * both settle every operation: "you already answered this" and "that offer
   * lapsed, ask again" are different things to tell a guest, and this field is
   * what tells them apart on a proposal with no operations to carry an outcome.
   */
  superseded?: boolean;
  /**
   * The operations the guest changed before accepting, as they were executed.
   *
   * Whole operations rather than the guest's answers, because every reader
   * wants the result and none wants to redo the merge: the proposal log sends
   * the model these ids, and the review surface prints this summary. Storing
   * only the answers would make each of them fold the answers into the
   * proposed operation again, with the menu as it is now rather than as it was.
   *
   * Only the operations that differ, and absent when none does. The proposal's
   * own `operations` is never rewritten — it is the record of what the MODEL
   * proposed, and a guest's correction must not erase the mistake it corrects.
   * Absent therefore means "the proposed operations are what was applied",
   * which is also what every decision stored before this field reads as.
   */
  appliedOperations?: AiOrderingOperation[];
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
 * A proposal's operations as the cart was actually asked to apply them.
 *
 * The one place the proposed and the applied versions are merged, so the model
 * and the reviewer cannot come to read a decision differently. The stored
 * snapshot is left as it is; this only reads it.
 */
export function readAiOrderingAppliedOperations(
  proposal: AiOrderingProposalSnapshot,
): {
  operations: AiOrderingOperation[];
  /** The operations the guest changed before accepting, in proposed order. */
  adjustedOperationIds: string[];
} {
  // `Mixed` in Mongo, so anything that is not a list is read as absent.
  const stored: unknown = proposal.decision?.appliedOperations;
  const applied = new Map(
    (Array.isArray(stored) ? (stored as AiOrderingOperation[]) : []).map(
      (operation) => [operation.operationId, operation],
    ),
  );
  const adjustedOperationIds: string[] = [];

  const operations = proposal.operations.map((operation) => {
    const replacement = applied.get(operation.operationId);

    if (!replacement) {
      return operation;
    }

    adjustedOperationIds.push(operation.operationId);

    return replacement;
  });

  return { operations, adjustedOperationIds };
}

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
  /**
   * What the model was working from this turn, and every call it took.
   *
   * Only the parts that differ from turn to turn. The core instructions, the
   * tools and the menu are the bulk of the prompt and identical on every turn,
   * so they are stored once on the conversation as a prompt prelude, which this
   * points at.
   */
  modelTrace?: AiOrderingModelTrace;
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
  /** See `AiOrderingPromptPrelude`. Absent on conversations stored before it. */
  promptPreludes?: AiOrderingPromptPrelude[];
  createdAt: Date;
  updatedAt: Date;
};
