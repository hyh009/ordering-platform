import type {
  AiOrderingOperationOutcome,
  AiOrderingOperationResult,
  AiOrderingPreviousOutcome,
} from '@/models/aiOrdering';
import type {
  AiOrderingPendingProposal,
  AiOrderingProposalRowStatus,
} from './store';

/**
 * The UI row status a guest produced, read as the outcome the assistant is told.
 *
 * `pending` becoming `no_action` is the whole point of the distinction: a row the
 * guest never touched before moving on is "you moved on", not "you removed the
 * tea". The assistant's next reply reads differently for the two, so collapsing
 * them would lose the one thing the report exists to carry.
 */
const OUTCOME_BY_ROW_STATUS: Record<
  AiOrderingProposalRowStatus,
  AiOrderingOperationOutcome
> = {
  pending: 'no_action',
  dismissed: 'rejected',
  applied: 'accepted',
  failed: 'failed',
};

/**
 * Builds the report that rides on the guest's next request.
 *
 * Every row is reported, including the accepted ones the cart already reflects,
 * so the assistant never has to infer an outcome from a row's absence.
 */
export function toAiOrderingPreviousOutcome(
  proposal: AiOrderingPendingProposal | null,
): AiOrderingPreviousOutcome | null {
  if (!proposal || proposal.rows.length === 0) {
    return null;
  }

  const results: AiOrderingOperationResult[] = proposal.rows.map((row) => {
    const result: AiOrderingOperationResult = {
      operationId: row.operation.operationId,
      outcome: OUTCOME_BY_ROW_STATUS[row.status],
    };

    if (row.status === 'failed' && row.failureCode !== undefined) {
      result.failureCode = row.failureCode;
    }

    return result;
  });

  return { proposalId: proposal.proposalId, results };
}
