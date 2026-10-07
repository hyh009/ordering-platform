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
  /**
   * Sampling temperature for every provider call this version makes.
   *
   * Versioned rather than per store or per deployment, and part of the
   * fingerprint: it changes what the model answers, so two runs at different
   * temperatures are not the same version being measured twice. A store has no
   * say in it for the same reason it has no say in the prompt.
   *
   * It is sent explicitly rather than left to the provider's default, so the
   * evaluation harness and production are the same configuration by
   * construction. They were not: the suite pinned 0 while production took
   * Gemini's default, which made every score a measurement of something we did
   * not ship.
   */
  temperature: number;
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
  /**
   * 1-based position in the whole conversation, not in the sent window.
   *
   * Numbered because the proposal log is rendered outside the history and has
   * to say WHEN each change was proposed. Counting from the conversation rather
   * than from the window keeps a turn's number the same once it is written,
   * which is also what keeps the history block's prefix cacheable.
   */
  turnNumber: number;
  message: string;
  reply: string;
  responseType: AiOrderingResponseType;
};

/**
 * One past proposal and how the cart answered it, addressed by turn number.
 *
 * Every proposal the model is shown takes this shape, the one it made last turn
 * included. They used to be two separate inputs rendered as two sections, which
 * left the newest outcome unnumbered and the model unable to tell how long ago
 * anything happened.
 */
export type AiOrderingProposalLogEntry = {
  /** Matches the `[Turn N]` label on the history turn that proposed it. */
  turnNumber: number;
  operations: AiOrderingOperation[];
  /** Empty only in the window between a decision being claimed and recorded. */
  results: AiOrderingOperationResult[];
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
  /**
   * Every proposal made so far with how each of its changes ended, oldest
   * first; the last entry is the one made on the previous turn.
   *
   * Rendered in the current turn rather than attached to the history turns that
   * made them: an outcome arrives after the turn that proposed it, so writing it
   * into the history would rewrite text the provider's prefix cache depends on
   * staying append-only. The turn number is what reconnects the two blocks.
   */
  proposalLog?: AiOrderingProposalLogEntry[];
  /**
   * Which turn the guest's current message is. Defaults to one past the last
   * history turn, which is right for every caller that did not window oddly.
   */
  currentTurnNumber?: number;
};
