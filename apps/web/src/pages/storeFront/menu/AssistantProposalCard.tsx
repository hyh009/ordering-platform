import { Check, RotateCcw, X } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n';
import { Button } from '@/shared/components/ui/button';

import type {
  AssistantProposalView,
  AssistantRowFailureKind,
} from './assistantPanelView';

/**
 * Why a row could not be applied, in the guest's terms.
 *
 * Each line says what happened AND what the guest can do about it, because a
 * reason with no next step ("Could not be applied") is the thing this table
 * exists to replace.
 */
const FAILURE_LABELS: Record<
  AssistantRowFailureKind,
  { key: string; fallback: string }
> = {
  'sold-out': {
    key: 'guest.assistant.rowFailure.soldOut',
    fallback: 'Sold out. Ask the assistant for something similar.',
  },
  'off-menu': {
    key: 'guest.assistant.rowFailure.offMenu',
    fallback: 'No longer on the menu.',
  },
  'options-changed': {
    key: 'guest.assistant.rowFailure.optionsChanged',
    fallback: 'The options changed. Please choose them again.',
  },
  'cart-closed': {
    key: 'guest.assistant.rowFailure.cartClosed',
    fallback: 'This cart is no longer taking changes.',
  },
  temporary: {
    key: 'guest.assistant.rowFailure.temporary',
    fallback: 'Could not reach the store. You can try again.',
  },
  unknown: {
    key: 'guest.assistant.rowFailure.unknown',
    fallback: 'Something went wrong. You can try again.',
  },
};

type AssistantProposalCardProps = {
  proposal: AssistantProposalView;
  isApplying: boolean;
  onDismissOperation: (operationId: string) => void;
  onRetryOperation: (operationId: string) => void;
  onApply: () => void;
};

/**
 * The proposal as a list the guest edits before accepting: one row per operation
 * with its own dismiss control, and a single apply at the bottom. Per-row dismiss
 * is what makes "mostly right" usable — the guest keeps three of four changes
 * instead of rejecting all of them and retyping.
 */
export function AssistantProposalCard({
  proposal,
  isApplying,
  onDismissOperation,
  onRetryOperation,
  onApply,
}: AssistantProposalCardProps) {
  const { tDefault } = useAppTranslation();

  return (
    <div className="rounded-xl border border-storefront-border bg-background p-3">
      <ul className="flex flex-col gap-2">
        {proposal.rows.map((row) => (
          <li key={row.operationId} className="flex flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
              <span
                className={
                  row.status === 'dismissed'
                    ? 'text-sm text-muted-foreground line-through'
                    : 'text-sm'
                }
              >
                {row.summary}
              </span>

              {row.canDismiss ? (
                <button
                  type="button"
                  aria-label={tDefault(
                    'guest.assistant.dismissOperation',
                    'Remove this change',
                  )}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                  onClick={() => {
                    onDismissOperation(row.operationId);
                  }}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {row.status === 'applied' ? (
                    <span className="flex items-center gap-1 text-storefront-primary">
                      <Check size={14} strokeWidth={2} />
                      {tDefault('guest.assistant.rowApplied', 'Added')}
                    </span>
                  ) : row.status === 'failed' ? (
                    row.isRetrying ? (
                      tDefault('guest.assistant.rowRetrying', 'Trying again…')
                    ) : (
                      tDefault(
                        'guest.assistant.rowFailed',
                        'Could not be applied',
                      )
                    )
                  ) : row.status === 'dismissed' ? (
                    tDefault('guest.assistant.rowDismissed', 'Removed')
                  ) : (
                    tDefault('guest.assistant.rowPending', 'Not applied')
                  )}
                </span>
              )}
            </div>

            {/* The reason sits under its own row rather than in the status
                column: it is a sentence, and squeezing it beside the summary
                would wrap both into something unreadable on a phone. */}
            {row.failure ? (
              <div className="flex items-start justify-between gap-2 pl-0">
                <span className="text-xs text-destructive">
                  {tDefault(
                    FAILURE_LABELS[row.failure.kind].key,
                    FAILURE_LABELS[row.failure.kind].fallback,
                  )}
                </span>

                {row.failure.canRetry ? (
                  <button
                    type="button"
                    className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs text-storefront-primary hover:bg-muted"
                    onClick={() => {
                      onRetryOperation(row.operationId);
                    }}
                  >
                    <RotateCcw size={12} strokeWidth={2} />
                    {tDefault('guest.assistant.rowRetry', 'Try again')}
                  </button>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {proposal.showsConfirmationControls && proposal.canApply ? (
        <Button
          variant="storefront"
          className="mt-3 w-full"
          disabled={isApplying}
          onClick={onApply}
        >
          {tDefault('guest.assistant.applyProposal', 'Add these to my cart')}
        </Button>
      ) : null}
    </div>
  );
}
