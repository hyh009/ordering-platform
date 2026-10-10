import type {
  AiOrderingAppliedSummaryModel,
  AiOrderingOperationOutcome,
  AiOrderingOperationResult,
  AiOrderingTranscriptTurn,
  AiOrderingTurn,
} from '@/models/aiOrdering';
import type {
  AiOrderingChatEntry,
  AiOrderingProposalRow,
  AiOrderingProposalRowStatus,
  StoreFrontAiOrderingStore,
} from './store';

/**
 * The row status a reported outcome produces.
 *
 * The inverse of the table the client used to keep for reporting: outcomes now
 * arrive from the server, so this is the only direction that still exists. The
 * three unapplied outcomes stay three statuses — a guest who never answered, one
 * who said no, and one whose proposal broke partway are not the same story.
 */
const ROW_STATUS_BY_OUTCOME: Record<
  AiOrderingOperationOutcome,
  AiOrderingProposalRowStatus
> = {
  accepted: 'applied',
  rejected: 'dismissed',
  superseded: 'unanswered',
  no_action: 'not-attempted',
  failed: 'failed',
};

export function createStoreFrontAiOrderingActions(
  store: StoreFrontAiOrderingStore,
) {
  function appendEntry(entry: AiOrderingChatEntry) {
    store.setState((state) => ({ entries: [...state.entries, entry] }));
  }

  /**
   * Writes a proposal's outcome onto the transcript entry that proposed it.
   *
   * The live proposal card and the transcript are two different renderings of
   * one proposal, and only the card used to be updated. The card is replaced by
   * the next message, so a guest reading back through the conversation saw every
   * past proposal with no verdict at all — an applied one and an abandoned one
   * looked identical, which is the thing this whole surface exists to prevent.
   *
   * Matched by proposal id rather than by position: a result can settle an entry
   * several turns back.
   */
  function recordProposalResults(
    proposalId: string,
    results: AiOrderingOperationResult[],
    appliedSummaries?: AiOrderingAppliedSummaryModel[],
    reply?: string,
  ) {
    store.setState((state) => ({
      entries: state.entries.map((entry) =>
        entry.role === 'assistant' &&
        entry.response.type === 'proposal' &&
        entry.response.proposalId === proposalId
          ? {
              ...entry,
              proposalResults: results,
              ...(appliedSummaries !== undefined
                ? { proposalAppliedSummaries: appliedSummaries }
                : {}),
              ...(reply !== undefined ? { proposalReply: reply } : {}),
            }
          : entry,
      ),
    }));
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
     * Each decided proposal carries the outcome the server recorded, so a
     * reloaded transcript shows the same verdicts the live one does. Only a
     * proposal the server still records as pending is restored as actionable;
     * see below.
     */
    transcriptLoaded(turns: AiOrderingTranscriptTurn[]) {
      const entries = turns.flatMap((turn): AiOrderingChatEntry[] => [
        { id: `${turn.id}:guest`, role: 'guest', message: turn.message },
        {
          id: `${turn.id}:assistant`,
          role: 'assistant',
          versionId: turn.versionId,
          response: turn.response,
          ...(turn.proposal?.status === 'decided'
            ? {
                proposalResults: turn.proposal.results,
                ...(turn.proposal.appliedSummaries !== undefined
                  ? {
                      proposalAppliedSummaries: turn.proposal.appliedSummaries,
                    }
                  : {}),
                // From the stored decision, so a reload does not keep the row
                // statuses and lose what the guest was told about them.
                ...(turn.proposal.reply !== undefined
                  ? { proposalReply: turn.proposal.reply }
                  : {}),
              }
            : {}),
        },
      ]);

      // A proposal the server still records as pending is restored as the live
      // one, so a guest who reloads mid-decision can still answer it. This is
      // what the server-side record bought: before it, a restored proposal had
      // to be read-only, because "already applied" and "never answered" looked
      // identical from here.
      const pending = turns.at(-1);
      const proposal =
        pending?.response.type === 'proposal' &&
        pending.proposal?.status === 'pending'
          ? {
              proposalId: pending.response.proposalId,
              confirmationRequired: pending.response.confirmationRequired,
              rows: pending.response.operations.map((operation) => ({
                operation,
                status: 'pending' as const,
              })),
              choiceAnswers: {},
              isApplied: false,
            }
          : null;

      store.setState({
        entries,
        proposal,
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

    applyStarted() {
      store.setState({ isApplying: true, error: null });
    },

    applyFinished() {
      store.setState({ isApplying: false });
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
      const { response, settledProposal } = entry.turn;

      // Settled by this very message: the guest had a proposal open and typed
      // instead of answering it. The server recorded that, so the rows it
      // settled get their verdict before the new entry is appended.
      if (settledProposal) {
        recordProposalResults(
          settledProposal.proposalId,
          settledProposal.results,
        );
      }

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
                choiceAnswers: {},
                isApplied: false,
              }
            : null,
      });
    },

    /**
     * Records the guest's answer to one choice on the proposal. It replaces any
     * earlier answer to the same choice and leaves every other one alone, so
     * changing a sugar level does not reopen the ice.
     *
     * No request: the options came with the proposal, so answering is local
     * until they apply. That is what makes picking a sugar level a tap rather
     * than another model call, which is what it used to cost.
     */
    proposalChoiceAnswered(input: {
      operationId: string;
      modifierId: string;
      optionIds: string[];
    }) {
      store.setState((state) =>
        state.proposal
          ? {
              proposal: {
                ...state.proposal,
                choiceAnswers: {
                  ...state.proposal.choiceAnswers,
                  [input.operationId]: {
                    ...state.proposal.choiceAnswers[input.operationId],
                    [input.modifierId]: input.optionIds,
                  },
                },
              },
            }
          : {},
      );
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
     * Writes the server's decision back onto every row.
     *
     * Every operation in the proposal comes back with a result, including the
     * dismissed ones and any a failure left unattempted, so this replaces each
     * row rather than merging: a row is whatever the side that executed it says
     * it is, not a blend of that and what the client assumed.
     */
    proposalDecided(
      results: AiOrderingOperationResult[],
      appliedSummaries?: AiOrderingAppliedSummaryModel[],
      reply?: string,
    ) {
      const byOperationId = new Map(
        results.map((result) => [result.operationId, result]),
      );

      const openProposalId = store.getState().proposal?.proposalId;

      if (openProposalId !== undefined) {
        recordProposalResults(
          openProposalId,
          results,
          appliedSummaries,
          reply,
        );
      }

      store.setState((state) =>
        state.proposal
          ? {
              proposal: {
                ...state.proposal,
                isApplied: true,
                rows: state.proposal.rows.map((row) => {
                  const result = byOperationId.get(row.operation.operationId);

                  if (!result) return row;

                  return {
                    operation: row.operation,
                    status: ROW_STATUS_BY_OUTCOME[result.outcome],
                    ...(result.failureCode !== undefined
                      ? {
                          failureCode:
                            result.failureCode as AiOrderingProposalRow['failureCode'],
                        }
                      : {}),
                  };
                }),
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
        isApplying: false,
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
