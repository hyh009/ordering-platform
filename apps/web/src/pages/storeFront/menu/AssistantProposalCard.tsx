import { Check, X } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n';
import { Button } from '@/shared/components/ui/button';

import type { AssistantProposalView } from './assistantPanelView';

type AssistantProposalCardProps = {
  proposal: AssistantProposalView;
  isApplying: boolean;
  onDismissOperation: (operationId: string) => void;
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
  onApply,
}: AssistantProposalCardProps) {
  const { tDefault } = useAppTranslation();

  return (
    <div className="rounded-xl border border-storefront-border bg-background p-3">
      <ul className="flex flex-col gap-2">
        {proposal.rows.map((row) => (
          <li
            key={row.operationId}
            className="flex items-start justify-between gap-2"
          >
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
                  tDefault('guest.assistant.rowFailed', 'Could not be applied')
                ) : row.status === 'dismissed' ? (
                  tDefault('guest.assistant.rowDismissed', 'Removed')
                ) : (
                  tDefault('guest.assistant.rowPending', 'Not applied')
                )}
              </span>
            )}
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

      {proposal.isApplied ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {tDefault(
            'guest.assistant.proposalResultHint',
            'Check your cart to review the result.',
          )}
        </p>
      ) : null}
    </div>
  );
}
