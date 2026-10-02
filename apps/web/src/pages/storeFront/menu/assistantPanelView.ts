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
import type { StoreFrontCommandFailureReason } from '@/services/utils/storeFrontApiError';

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
 * Reason to kind, exhaustively, so adding a failure reason forces a decision
 * about what the guest reads instead of letting it fall into a generic line.
 *
 * This is the step the first implementation skipped: the reason was captured,
 * stored, and reported to the merchant, then thrown away at the one point where
 * it would have helped the person it happened to.
 */
const FAILURE_KIND_BY_REASON: Record<
  StoreFrontCommandFailureReason,
  AssistantRowFailureKind
> = {
  'sold-out': 'sold-out',
  // The id resolved against the menu when the assistant proposed it and does
  // not now — the usual cause is a proposal restored after the menu changed.
  'not-found': 'off-menu',
  invalid: 'options-changed',
  'cart-not-active': 'cart-closed',
  'order-locked': 'cart-closed',
  'store-closed': 'cart-closed',
  'session-expired': 'cart-closed',
  'session-store-mismatch': 'cart-closed',
  'rate-limited': 'temporary',
  network: 'temporary',
  server: 'temporary',
  // Not reachable from a cart command; mapped so the table stays exhaustive.
  'invalid-join-code': 'unknown',
  'assistant-unavailable': 'unknown',
  'assistant-conversation-full': 'unknown',
  unknown: 'unknown',
};

/**
 * Whether re-running the same operation could plausibly succeed.
 *
 * Offering a retry that must fail is worse than offering none: it reads as the
 * guest's fault when the second attempt fails the same way. So a sold-out
 * product or a closed cart gets an explanation and no button.
 */
const RETRYABLE_FAILURE_KINDS: ReadonlySet<AssistantRowFailureKind> = new Set([
  'temporary',
  'unknown',
]);

/**
 * How a proposal in the transcript should be drawn.
 *
 * - `live` — the one the guest is deciding on; the card owns it.
 * - `history` — an earlier proposal in this session, already answered. Shown as a
 *   record so scrolling back reads as a conversation.
 * - `stale` — the latest proposal with no live state behind it, which only
 *   happens on a transcript restored from the server. Not actionable: the server
 *   does not know whether the guest applied it before reloading, so an Apply
 *   button here could add the same items twice.
 */
export type AssistantProposalRecord = 'live' | 'history' | 'stale';

export type AssistantProposalRowView = {
  operationId: string;
  summary: string;
  status: AiOrderingProposalRowStatus;
  /** Present only on a `failed` row, and only once the reason is known. */
  failure?: { kind: AssistantRowFailureKind; canRetry: boolean };
  /** True only while this one row's retry is in flight. */
  isRetrying: boolean;
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
  context: { liveProposalId: string | undefined; isLast: boolean },
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
          context.liveProposalId === response.proposalId
            ? 'live'
            : context.isLast
              ? 'stale'
              : 'history',
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
    const isRetrying = row.isRetrying === true;
    const kind =
      row.status === 'failed' && row.failureCode !== undefined
        ? FAILURE_KIND_BY_REASON[row.failureCode]
        : undefined;

    return {
      operationId: row.operation.operationId,
      summary: row.operation.summary,
      status: row.status,
      isRetrying,
      // Undecided is the only dismissable state, and it survives an apply that
      // aborted part-way: those rows were never attempted, so the guest still
      // gets to drop them.
      canDismiss: row.status === 'pending',
      ...(kind !== undefined
        ? {
            failure: {
              kind,
              canRetry: RETRYABLE_FAILURE_KINDS.has(kind) && !isRetrying,
            },
          }
        : {}),
    };
  });

  return {
    proposalId: proposal.proposalId,
    rows,
    showsConfirmationControls: proposal.confirmationRequired,
    // Nothing left to apply is not an error to report after the fact: the
    // control goes away, so dismissing the last row cannot leave an Apply button
    // that would fail.
    //
    // Deliberately not gated on `isApplied`. An apply that aborted on a
    // session-scoped failure leaves rows it never attempted, and gating here
    // would strand them: no Apply, no retry, just "Not applied" forever. The
    // apply flow only ever touches pending rows, so offering it again resumes
    // where it stopped instead of redoing anything.
    canApply: rows.some((row) => row.status === 'pending'),
    isApplied: proposal.isApplied,
  };
}

export function buildAssistantPanelView(input: {
  state: StoreFrontAiOrderingState;
  isAvailable: boolean;
}): AssistantPanelView {
  const { state } = input;
  const entries = state.entries.map((entry, index) =>
    toEntryView(entry, {
      liveProposalId: state.proposal?.proposalId,
      isLast: index === state.entries.length - 1,
    }),
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
