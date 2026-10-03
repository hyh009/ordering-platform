/**
 * The pure half of the assistant panel's VM: feature state in, render-ready
 * shape out.
 *
 * It lives beside `useAssistantPanelVM` rather than inside it because the web
 * workspace has no component-test environment, so the only way to test what the
 * panel will show is to test the shape it is handed. The hook keeps the parts
 * that need React — effects, handlers, command-result reactions.
 */

import type {
  AiOrderingChoiceInputMode,
  AiOrderingChoiceModel,
  AiOrderingUnansweredReason,
} from '@/models/aiOrdering';
import type {
  AiOrderingProposalRowStatus,
  StoreFrontAiOrderingState,
} from '@/features/storeFront/aiOrdering/store';

export type AssistantEntryView =
  | { id: string; kind: 'guest'; text: string }
  | { id: string; kind: 'message'; reply: string }
  | {
      id: string;
      kind: 'choices';
      reply: string;
      question: string;
      inputMode: AiOrderingChoiceInputMode;
      options: AiOrderingChoiceModel[];
      promptId: string;
      /** Always true: a guest may type instead of picking. */
      allowsFreeText: boolean;
    }
  | {
      id: string;
      kind: 'proposal';
      reply: string;
      proposalId: string;
      /** Always present, so a proposal reads as a list even with no live card. */
      operations: { operationId: string; summary: string }[];
      record: AssistantProposalRecord;
      /**
       * Per-operation results, present once the proposal has been decided.
       *
       * Drawn from what the server recorded rather than from the panel's
       * memory, so a reloaded transcript shows what actually happened instead
       * of telling a guest to ask again for something already in their cart.
       */
      results?: { operationId: string; outcome: string; failureCode?: string }[];
    }
  | {
      id: string;
      kind: 'unanswered';
      reply: string;
      reason: AiOrderingUnansweredReason;
    };

/**
 * What the guest is told about a failed row, as a presentation kind rather than
 * the raw failure reason.
 *
 * Several reasons collapse into one kind because the guest's situation is the
 * same even though the cause differs — `order-locked` and `store-closed` both
 * mean "this cart will not take changes any more" — and the panel should not
 * teach the guest the API's vocabulary.
 */
export type AssistantRowFailureKind =
  | 'sold-out'
  | 'off-menu'
  | 'options-changed'
  | 'cart-closed'
  | 'temporary'
  | 'unknown';

/**
 * Backend error code to the wording kind the guest reads.
 *
 * A partial map on purpose, with `unknown` as the fallback: these codes are the
 * API's whole error vocabulary, most of which a cart operation can never
 * produce, so an exhaustive table would be mostly noise asserting that
 * `USER_NOT_FOUND` is not a cart failure. What matters is that every code a cart
 * operation CAN produce is named here; `aiOrdering/cartExecution.ts` on the
 * backend is the list it has to stay in step with.
 */
const FAILURE_KIND_BY_CODE: Partial<Record<string, AssistantRowFailureKind>> = {
  PRODUCT_SOLD_OUT: 'sold-out',
  // The id resolved against the menu when the assistant proposed it and does
  // not now — the usual cause is a proposal answered after the menu changed.
  PRODUCT_NOT_FOUND: 'off-menu',
  CART_ITEM_NOT_FOUND: 'off-menu',
  MODIFIER_SELECTION_INVALID: 'options-changed',
  BAD_REQUEST: 'options-changed',
  NOT_ITEM_OWNER: 'options-changed',
  CART_NOT_ACTIVE: 'cart-closed',
  CART_NOT_FOUND: 'cart-closed',
  ORDER_LOCKED: 'cart-closed',
  ORDER_NOT_FOUND: 'cart-closed',
  ORDER_TYPE_NOT_ENABLED: 'cart-closed',
  STORE_NOT_OPEN: 'cart-closed',
  INVALID_GUEST_TOKEN: 'cart-closed',
  TOO_MANY_REQUESTS: 'temporary',
  INTERNAL_SERVER_ERROR: 'temporary',
  CONFLICT: 'temporary',
};

/**
 * How a proposal in the transcript should be drawn.
 *
 * - `live` — the one the guest is deciding on; the card owns it.
 * - `history` — a proposal that has been decided. Shown as a record, with the
 *   results the server recorded, so scrolling back reads as a conversation.
 *
 * There is no third state. A restored proposal that is still pending comes back
 * as `live`, because the server now records whether a proposal was decided —
 * which is exactly what the panel could not tell before, and why it used to warn
 * a guest to ask again for something already in their cart.
 */
export type AssistantProposalRecord = 'live' | 'history';

export type AssistantProposalRowView = {
  operationId: string;
  summary: string;
  status: AiOrderingProposalRowStatus;
  /** Present only on a `failed` row, and only once the reason is known. */
  failure?: { kind: AssistantRowFailureKind };
  /** A row can only be dismissed while it is still undecided. */
  canDismiss: boolean;
};

export type AssistantProposalView = {
  proposalId: string;
  rows: AssistantProposalRowView[];
  /**
   * Whether the guest decides. Resolved server-side from the store setting AND
   * the active version's permission — the panel only reports it.
   */
  showsConfirmationControls: boolean;
  /** False once every row is dismissed, or once the proposal has been applied. */
  canApply: boolean;
  isApplied: boolean;
};

export type AssistantPanelView = {
  /** False hides the entry point entirely; the panel is never reachable. */
  isAvailable: boolean;
  entries: AssistantEntryView[];
  proposal: AssistantProposalView | null;
  /** The prompt a typed answer or a picked option should answer, if any. */
  openPrompt: { promptId: string } | null;
  isSending: boolean;
  /**
   * True while an accepted proposal is being applied to the cart.
   *
   * Reported separately from `isSending` because the panel treats them
   * differently: a turn in flight shows a thinking line inside the transcript,
   * while an apply blocks the surface until the cart has settled.
   */
  isApplying: boolean;
  /**
   * True while the stored transcript is being read. Distinct from `isSending`:
   * one is the panel filling itself in, the other is a turn in flight.
   */
  isLoadingTranscript: boolean;
  /**
   * True only once the transcript is known to be empty. The empty-state hint has
   * to wait for that, or it flashes "ask me about a dish" at a guest who is
   * mid-conversation.
   */
  showsEmptyHint: boolean;
  error: string | null;
};

function toEntryView(
  entry: StoreFrontAiOrderingState['entries'][number],
  context: { liveProposalId: string | undefined },
): AssistantEntryView {
  if (entry.role === 'guest') {
    return { id: entry.id, kind: 'guest', text: entry.message };
  }

  const { response } = entry;

  switch (response.type) {
    case 'message':
      return { id: entry.id, kind: 'message', reply: response.reply };

    case 'choices':
      return {
        id: entry.id,
        kind: 'choices',
        reply: response.reply,
        question: response.question,
        inputMode: response.inputMode,
        options: response.options,
        promptId: response.promptId,
        allowsFreeText: response.allowFreeText,
      };

    case 'proposal':
      return {
        id: entry.id,
        kind: 'proposal',
        reply: response.reply,
        proposalId: response.proposalId,
        operations: response.operations.map((operation) => ({
          operationId: operation.operationId,
          summary: operation.summary,
        })),
        record:
          context.liveProposalId === response.proposalId ? 'live' : 'history',
        // Results the server recorded, present on every decided proposal
        // including one restored after a reload.
        ...(entry.proposalResults !== undefined
          ? { results: entry.proposalResults }
          : {}),
      };

    case 'unanswered':
      return {
        id: entry.id,
        kind: 'unanswered',
        reply: response.reply,
        reason: response.reason,
      };
  }
}

function toProposalView(
  proposal: NonNullable<StoreFrontAiOrderingState['proposal']>,
): AssistantProposalView {
  const rows: AssistantProposalRowView[] = proposal.rows.map((row) => {
    const kind =
      row.status === 'failed' && row.failureCode !== undefined
        ? (FAILURE_KIND_BY_CODE[row.failureCode] ?? 'unknown')
        : undefined;

    return {
      operationId: row.operation.operationId,
      summary: row.operation.summary,
      status: row.status,
      // Undecided is the only dismissable state. Once the proposal is decided
      // every row has a result, and a decided proposal cannot be answered again.
      canDismiss: row.status === 'pending',
      ...(kind !== undefined ? { failure: { kind } } : {}),
    };
  });

  return {
    proposalId: proposal.proposalId,
    rows,
    showsConfirmationControls: proposal.confirmationRequired,
    // Gated on `isApplied` again, now that it means something it did not
    // before: the proposal has been decided, and a decided proposal cannot be
    // answered a second time. There are no stranded rows to resume, because the
    // server reports a result for every operation including the ones a failure
    // left unattempted.
    canApply: !proposal.isApplied && rows.some((row) => row.status === 'pending'),
    isApplied: proposal.isApplied,
  };
}

export function buildAssistantPanelView(input: {
  state: StoreFrontAiOrderingState;
  isAvailable: boolean;
}): AssistantPanelView {
  const { state } = input;
  const entries = state.entries.map((entry) =>
    toEntryView(entry, { liveProposalId: state.proposal?.proposalId }),
  );

  // Only the LAST answer's prompt is open. An older question the guest scrolled
  // past is not what their next message answers.
  const lastEntry = entries.at(-1);
  const openPrompt =
    lastEntry?.kind === 'choices' ? { promptId: lastEntry.promptId } : null;

  return {
    isAvailable: input.isAvailable,
    entries,
    proposal: state.proposal ? toProposalView(state.proposal) : null,
    openPrompt,
    isSending: state.isSending,
    isApplying: state.isApplying,
    isLoadingTranscript: state.isLoading,
    showsEmptyHint: state.isLoaded && entries.length === 0,
    error: state.error,
  };
}
