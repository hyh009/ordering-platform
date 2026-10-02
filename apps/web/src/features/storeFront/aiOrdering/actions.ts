import type {
  AiOrderingTranscriptTurn,
  AiOrderingTurn,
} from '@/models/aiOrdering';
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
    transcriptLoadStarted() {
      store.setState({ isLoading: true, error: null });
    },

    /**
     * Replaces the transcript with the stored one.
     *
     * Both halves of each turn are rebuilt, keyed off the stored turn id, so the
     * panel shows the conversation rather than a column of replies.
     *
     * The open proposal is deliberately NOT restored as actionable. The server
     * learns what became of a proposal only when the NEXT message carries its
     * outcome, so a proposal that is the last stored turn is indistinguishable
     * from one the guest already applied before reloading. Restoring an Apply
     * button on it would add those items to the cart a second time. The rows are
     * still shown — read-only, from the turn itself — so nothing is hidden.
     */
    transcriptLoaded(turns: AiOrderingTranscriptTurn[]) {
      const entries = turns.flatMap((turn): AiOrderingChatEntry[] => [
        { id: `${turn.id}:guest`, role: 'guest', message: turn.message },
        {
          id: `${turn.id}:assistant`,
          role: 'assistant',
          versionId: turn.versionId,
          response: turn.response,
        },
      ]);

      store.setState({
        entries,
        proposal: null,
        isLoaded: true,
        isLoading: false,
        error: null,
      });
    },

    transcriptLoadFailed(error: string) {
      // `isLoaded` stays false: the panel should retry on the next open rather
      // than show an empty transcript as though the guest had said nothing.
      store.setState({ isLoading: false, error });
    },

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
    proposalApplied(
      results: { operationId: string; row: AiOrderingProposalRow }[],
    ) {
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
     * Marks one failed row as being retried.
     *
     * The row keeps its `failed` status and its `failureCode` while the retry is
     * in flight: clearing them first would blank the reason the guest is looking
     * at, and a retry that fails the same way would read as a new failure.
     */
    operationRetryStarted(operationId: string) {
      store.setState((state) =>
        state.proposal
          ? {
              proposal: {
                ...state.proposal,
                rows: state.proposal.rows.map((row) =>
                  row.operation.operationId === operationId &&
                  row.status === 'failed'
                    ? { ...row, isRetrying: true }
                    : row,
                ),
              },
            }
          : {},
      );
    },

    /**
     * Writes one retried row's result back, replacing the row outright.
     *
     * Replacing rather than merging is what drops `isRetrying` and a stale
     * `failureCode` on success, so a row that now reads `applied` cannot still
     * carry the reason it failed the first time.
     */
    operationRetried(result: {
      operationId: string;
      row: AiOrderingProposalRow;
    }) {
      store.setState((state) =>
        state.proposal
          ? {
              proposal: {
                ...state.proposal,
                rows: state.proposal.rows.map((row) =>
                  row.operation.operationId === result.operationId
                    ? result.row
                    : row,
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
        // Back to unfetched, not to "fetched and empty": this runs when the cart
        // or session changes, and the next panel open belongs to a different
        // conversation that has not been read yet.
        isLoaded: false,
        isLoading: false,
        error: null,
      });
    },
  };
}

export type StoreFrontAiOrderingActions = ReturnType<
  typeof createStoreFrontAiOrderingActions
>;
