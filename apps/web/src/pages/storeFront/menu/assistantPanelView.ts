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
  | { id: string; kind: 'proposal'; reply: string; proposalId: string }
  | {
      id: string;
      kind: 'unanswered';
      reply: string;
      reason: AiOrderingUnansweredReason;
    };

export type AssistantProposalRowView = {
  operationId: string;
  summary: string;
  status: AiOrderingProposalRowStatus;
  failureCode?: string;
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
  error: string | null;
};

function toEntryView(
  entry: StoreFrontAiOrderingState['entries'][number],
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
  const rows: AssistantProposalRowView[] = proposal.rows.map((row) => ({
    operationId: row.operation.operationId,
    summary: row.operation.summary,
    status: row.status,
    canDismiss: row.status === 'pending' && !proposal.isApplied,
    ...(row.failureCode !== undefined
      ? { failureCode: row.failureCode }
      : {}),
  }));

  return {
    proposalId: proposal.proposalId,
    rows,
    showsConfirmationControls: proposal.confirmationRequired,
    // Nothing left to apply is not an error to report after the fact: the
    // control goes away, so dismissing the last row cannot leave an Apply button
    // that would fail.
    canApply:
      !proposal.isApplied && rows.some((row) => row.status === 'pending'),
    isApplied: proposal.isApplied,
  };
}

export function buildAssistantPanelView(input: {
  state: StoreFrontAiOrderingState;
  isAvailable: boolean;
}): AssistantPanelView {
  const { state } = input;
  const entries = state.entries.map(toEntryView);

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
    error: state.error,
  };
}
