import type { AiOrderingTurn } from '@/models/aiOrdering';
import type {
  AiOrderingChatEntry,
  AiOrderingProposalRow,
  StoreFrontAiOrderingStore,
} from './store';

export function createStoreFrontAiOrderingActions(
  store: StoreFrontAiOrderingStore,
) {
  function appendEntry(entry: AiOrderingChatEntry) {
    store.setState((state) => ({ entries: [...state.entries, entry] }));
  }

  return {
    sendStarted() {
      store.setState({ error: null, isSending: true });
    },

    sendFailed(error: string) {
      store.setState({ error, isSending: false });
    },

    guestMessageAppended(entry: { id: string; message: string }) {
      appendEntry({ id: entry.id, role: 'guest', message: entry.message });
    },

    /**
     * Records the assistant's answer and, when it is a proposal, opens it for the
     * guest to decide on.
     *
     * A proposal always replaces whatever was open: the previous one's outcome
     * was already captured by the command that sent this message, so keeping it
     * would leave a card the assistant has stopped reasoning about.
     */
    turnAppended(entry: { id: string; turn: AiOrderingTurn }) {
      const { response } = entry.turn;

      appendEntry({
        id: entry.id,
        role: 'assistant',
        versionId: entry.turn.versionId,
        response,
      });

      store.setState({
        isSending: false,
        error: null,
        proposal:
          response.type === 'proposal'
            ? {
                proposalId: response.proposalId,
                confirmationRequired: response.confirmationRequired,
                rows: response.operations.map((operation) => ({
                  operation,
                  status: 'pending',
                })),
                isApplied: false,
              }
            : null,
      });
    },

    operationDismissed(operationId: string) {
      store.setState((state) =>
        state.proposal
          ? {
              proposal: {
                ...state.proposal,
                rows: state.proposal.rows.map((row) =>
                  row.operation.operationId === operationId &&
                  row.status === 'pending'
                    ? { ...row, status: 'dismissed' as const }
                    : row,
                ),
              },
            }
          : {},
      );
    },

    /**
     * Writes the apply results back onto the rows the apply flow attempted.
     *
     * Rows the flow did not attempt — the dismissed ones — keep their status, so
     * one apply never rewrites a decision the guest already made.
     */
    proposalApplied(results: { operationId: string; row: AiOrderingProposalRow }[]) {
      const byOperationId = new Map(
        results.map((result) => [result.operationId, result.row]),
      );

      store.setState((state) =>
        state.proposal
          ? {
              proposal: {
                ...state.proposal,
                isApplied: true,
                rows: state.proposal.rows.map(
                  (row) => byOperationId.get(row.operation.operationId) ?? row,
                ),
              },
            }
          : {},
      );
    },

    /**
     * Closes the open proposal without recording anything.
     *
     * The outcome is read off the rows BEFORE this runs, by the command that is
     * about to send the next message. Expiry here is only the UI half.
     */
    proposalExpired() {
      store.setState({ proposal: null });
    },

    conversationCleared() {
      store.setState({
        entries: [],
        proposal: null,
        isSending: false,
        error: null,
      });
    },
  };
}

export type StoreFrontAiOrderingActions = ReturnType<
  typeof createStoreFrontAiOrderingActions
>;
