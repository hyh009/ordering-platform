import { Check } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n';

type AssistantProposalRecordProps = {
  operations: { operationId: string; summary: string }[];
  /**
   * What became of each operation, as the server recorded it when it executed.
   *
   * Absent only for a proposal from before outcomes were recorded server-side;
   * the rows are then shown without a verdict rather than with a guessed one.
   */
  results?: { operationId: string; outcome: string; failureCode?: string }[];
};

const OUTCOME_LABELS: Record<string, { key: string; fallback: string }> = {
  accepted: { key: 'guest.assistant.rowApplied', fallback: 'Added' },
  rejected: { key: 'guest.assistant.rowDismissed', fallback: 'Removed' },
  failed: {
    key: 'guest.assistant.rowFailed',
    fallback: 'Could not be applied',
  },
  superseded: {
    key: 'guest.assistant.rowUnanswered',
    fallback: 'Not answered',
  },
  no_action: {
    key: 'guest.assistant.rowNotAttempted',
    fallback: 'Not attempted',
  },
};

/**
 * A proposal that has already been answered, shown as a record.
 *
 * It carries the real per-operation outcome rather than a hedge. Before the
 * backend recorded outcomes, a restored proposal could only be shown with
 * "ask again if you still want it" — which was wrong exactly when it mattered,
 * for a guest looking at a proposal whose items were already in their cart.
 */
export function AssistantProposalRecord({
  operations,
  results,
}: AssistantProposalRecordProps) {
  const { tDefault } = useAppTranslation();
  const byOperationId = new Map(
    (results ?? []).map((result) => [result.operationId, result]),
  );

  return (
    <div className="rounded-xl border border-dashed border-storefront-border p-3">
      <ul className="flex flex-col gap-1">
        {operations.map((operation) => {
          const outcome = byOperationId.get(operation.operationId)?.outcome;
          const label = outcome ? OUTCOME_LABELS[outcome] : undefined;

          return (
            <li
              key={operation.operationId}
              className="flex items-start justify-between gap-2 text-sm text-muted-foreground"
            >
              <span
                className={outcome === 'rejected' ? 'line-through' : undefined}
              >
                {operation.summary}
              </span>

              {label ? (
                <span
                  className={
                    outcome === 'accepted'
                      ? 'flex shrink-0 items-center gap-1 text-xs text-storefront-primary'
                      : 'shrink-0 text-xs'
                  }
                >
                  {outcome === 'accepted' ? (
                    <Check size={14} strokeWidth={2} />
                  ) : null}
                  {tDefault(label.key, label.fallback)}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
