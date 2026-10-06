import type {
  AiOrderingChoice,
  AiOrderingOperation,
  AiOrderingOperationResult,
  AiOrderingResponseType,
  CartDto,
  PublicMenuDto,
  SupportedLocale,
} from '@repo/shared';

export type AiOrderingGuestContext = {
  organizationId: string;
  storeId: string;
  cartId: string;
  participantId: string;
};

/**
 * Whether a version may still be edited.
 *
 * `draft` is a version still being shaped. Its file may be edited freely, and
 * its stored turns are development data, not a baseline — two turns carrying the
 * same draft `versionId` may have been produced by different prompts.
 *
 * `stable` is frozen. Its file is never edited again, because its `versionId` is
 * what a stored turn points at when a later model is replayed against it, and
 * editing would silently redefine that. A test pins every stable version's
 * fingerprint, so freezing is enforced rather than remembered.
 *
 * Promotion is one-way: draft to stable. A stable version that turns out to be
 * wrong gets a successor, not a demotion.
 */
export type AiOrderingVersionStatus = 'draft' | 'stable';

/**
 * One assistant version: the prompt and the settings that shaped its behavior.
 *
 * A file per version. A `stable` one is never edited after release, so a later
 * model can be replayed against an older prompt and the comparison means
 * something; a `draft` one is still being written. Every turn records the
 * version's fingerprint alongside its id, so a draft's corpus stays readable
 * across edits.
 *
 * Deliberately no model name. Version and model are separate replay axes — the
 * entire point is running THIS prompt against a NEWER model — so the model is
 * supplied by the runtime and recorded per turn instead of pinned here.
 */
export type AiOrderingVersionConfig = {
  versionId: string;
  /** Whether this version may still be edited. See `AiOrderingVersionStatus`. */
  status: AiOrderingVersionStatus;
  /** The system prompt for this version. Contains no store-specific text. */
  coreInstructions: string;
  /** Instructions used when rebuilding the rolling summary. Frozen with the version. */
  summaryInstructions: string;
  /** Upper bound on a rebuilt summary, so the context it feeds stays bounded. */
  maxSummaryCharacters: number;
  /**
   * Whether a store is allowed to skip guest confirmation on this version. A new
   * version starts `false`, so every store falls back to confirming until the
   * version has been validated; a store's own setting can never widen this.
   */
  permitsAutomaticApplication: boolean;
  /** How many recent turns are sent to the model. Bounds context, not storage. */
  maxHistoryTurns: number;
  /**
   * How many turns must age out of the window before the summary is rebuilt.
   *
   * Batched rather than per-turn: rebuilding the moment a single turn falls out
   * of the window would add a model call to nearly every request past the tenth.
   * Versioned because it trades cost against how stale the summary may get, and
   * that trade is part of what a version is.
   */
  summarizeAfterAgedOutTurns: number;
  maxOperationsPerProposal: number;
  maxReplyCharacters: number;
  /** Budget for a single provider call. */
  timeoutMs: number;
  /**
   * Hard ceiling on one whole turn, covering everything: both planning calls, a
   * summary rebuild, and the database and menu reads in between.
   *
   * The per-call timeout alone does not bound a turn — anything that is not a
   * provider call is outside it. This is what guarantees the in-flight lock is
   * always released by the request that took it, which in turn is what lets that
   * lock's expiry be set generously.
   */
  maxTurnDurationMs: number;
};

/** A prior turn compacted for the model. Never the raw model output. */
export type AiOrderingHistoryTurn = {
  message: string;
  reply: string;
  responseType: AiOrderingResponseType;
};

/**
 * A `responseToPromptId` resolved against the guest's own conversation, so the
 * model sees the chosen option's label and the question that offered it rather
 * than a bare id it cannot interpret. `selectedOption` is absent when the guest
 * answered by typing instead of choosing.
 */
export type AiOrderingResolvedPrompt = {
  promptId: string;
  question: string;
  selectedOption?: AiOrderingChoice;
};

export type AiOrderingContextItem = {
  itemId: string;
  productId: string;
  productName: string;
  quantity: number;
  selectedOptionLabels: string[];
  notes?: string;
};

/**
 * The cart as the model sees it: everything is readable, but what the guest may
 * change is listed separately from what they may not.
 *
 * The split is structural on purpose. Telling the model "do not modify other
 * participants' items" in prose and then handing it one flat list invites the
 * mistake; two lists make the rule visible in the data itself.
 */
export type AiOrderingCartContext = {
  participantId: string;
  modifiableItems: AiOrderingContextItem[];
  readOnlyItems: AiOrderingContextItem[];
};

export type AiOrderingContextBlockKind =
  | 'core_instructions'
  | 'store_data'
  | 'history'
  | 'current_turn';

export type AiOrderingContextBlock = {
  kind: AiOrderingContextBlockKind;
  role: 'system' | 'user';
  text: string;
};

/**
 * The assembled model input, ordered most-static first so the provider's
 * prefix cache can hit. See `context.ts` for why the order is what it is.
 */
export type AiOrderingAssembledContext = {
  versionId: string;
  blocks: AiOrderingContextBlock[];
};

export type AiOrderingContextInput = {
  config: AiOrderingVersionConfig;
  locale: SupportedLocale;
  storeName: string;
  menu: PublicMenuDto;
  cart: CartDto;
  participantId: string;
  message: string;
  history: AiOrderingHistoryTurn[];
  summary?: string;
  resolvedPrompt?: AiOrderingResolvedPrompt;
  reportedOutcomes?: AiOrderingOperationResult[];
  /**
   * What the most recent proposal actually proposed, so each reported outcome
   * names a change instead of a bare operation id.
   *
   * Only the most recent proposal, and only alongside its outcomes. It is
   * rendered in the current turn rather than attached to the history turn that
   * made it: marking one history turn as "the latest" would rewrite earlier
   * text every time a newer proposal appeared, and the history block is
   * append-only so that its prefix stays cacheable.
   */
  lastProposalOperations?: AiOrderingOperation[];
  /**
   * Every proposal BEFORE the most recent one, oldest first, with how each of
   * its changes ended.
   *
   * The history block carries only what was said, and "please confirm" reads
   * the same whether the guest then accepted or walked away. Without this the
   * model could not tell a change that was made two turns ago from one still
   * waiting, and proposed the first kind again. Rendered in the current turn
   * for the same reason the latest outcome is: an outcome arrives after the
   * turn that proposed it, and the history block is append-only.
   */
  earlierProposals?: {
    operations: AiOrderingOperation[];
    results: AiOrderingOperationResult[];
  }[];
};
