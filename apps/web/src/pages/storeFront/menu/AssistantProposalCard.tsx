import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n';
import { Button } from '@/shared/components/ui/button';

import { canConfirmChoice, toggleChoiceOption } from './assistantPanelView';

import type {
  AssistantChoicePickerView,
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
  'item-gone': {
    key: 'guest.assistant.rowFailure.itemGone',
    fallback: 'That item is no longer in your cart. Ask for it again.',
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
  onAnswerChoice: (input: {
    operationId: string;
    modifierId: string;
    optionIds: string[];
  }) => void;
  onApply: () => void;
};

/**
 * The proposal as a list the guest edits before accepting: one row per operation
 * with its own dismiss control, and a single apply at the bottom. Per-row dismiss
 * is what makes "mostly right" usable — the guest keeps three of four changes
 * instead of rejecting all of them and retyping.
 *
 * A choice the assistant left open is asked here, ONE at a time, between the
 * rows and the apply button. One at a time because the alternative is a wall of
 * pickers on every row, and because the next question often depends on how the
 * last one felt. Answering costs no request: the options arrived with the
 * proposal, so this is a tap rather than another turn of conversation.
 *
 * A choice that already has an answer sits on its row as text. Tapping it puts
 * THAT choice in the same picker, ahead of whatever was being asked, and
 * answering puts the queue back. So there is still one picker, and correcting a
 * sugar level the assistant guessed is a tap instead of an argument with it.
 */
export function AssistantProposalCard({
  proposal,
  isApplying,
  onDismissOperation,
  onAnswerChoice,
  onApply,
}: AssistantProposalCardProps) {
  const { tDefault } = useAppTranslation();

  // Which answered choice the guest has opened to change. Which option is
  // selected is not kept here: that is the proposal's state and goes through
  // `onAnswerChoice`. This is only "which picker is showing".
  const [editing, setEditing] = useState<{
    operationId: string;
    modifierId: string;
  } | null>(null);

  // Looked up on every render rather than stored, so a row that has since been
  // dismissed or applied simply stops being editable and the queue takes over.
  const edited = editing
    ? proposal.rows
        .find(
          (row) =>
            row.operationId === editing.operationId && row.canEditChoices,
        )
        ?.choices.find((choice) => choice.modifierId === editing.modifierId)
    : undefined;
  const picker = edited ?? proposal.openChoice;

  return (
    // A column with a scrolling list, so in a height-limited container the rows
    // scroll and the apply button stays in view however many rows there are.
    <div className="flex min-h-0 flex-col rounded-xl border border-storefront-border bg-background p-3">
      <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto">
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
                    tDefault(
                      'guest.assistant.rowFailed',
                      'Could not be applied',
                    )
                  ) : row.status === 'dismissed' ? (
                    tDefault('guest.assistant.rowDismissed', 'Removed')
                  ) : row.status === 'not-attempted' ? (
                    tDefault('guest.assistant.rowNotAttempted', 'Not attempted')
                  ) : (
                    tDefault('guest.assistant.rowPending', 'Not applied')
                  )}
                </span>
              )}
            </div>

            {row.choices.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {row.choices.map((choice) => {
                  const text = tDefault(
                    'guest.assistant.choiceValue',
                    '{{label}}: {{value}}',
                    {
                      label: choice.label,
                      value:
                        choice.selectedLabels.length > 0
                          ? choice.selectedLabels.join(' / ')
                          : tDefault('guest.assistant.choiceNone', 'None'),
                    },
                  );
                  const isEditing =
                    edited?.operationId === choice.operationId &&
                    edited.modifierId === choice.modifierId;

                  return (
                    <li key={choice.modifierId}>
                      {row.canEditChoices ? (
                        <button
                          type="button"
                          aria-pressed={isEditing}
                          aria-label={tDefault(
                            'guest.assistant.changeChoice',
                            'Change {{choice}}',
                            { choice: text },
                          )}
                          disabled={isApplying}
                          className={
                            isEditing
                              ? 'flex items-center gap-1 rounded-full border border-storefront-primary px-2 py-0.5 text-xs text-storefront-primary'
                              : 'flex items-center gap-1 rounded-full border border-storefront-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted'
                          }
                          onClick={() => {
                            setEditing(
                              isEditing
                                ? null
                                : {
                                    operationId: choice.operationId,
                                    modifierId: choice.modifierId,
                                  },
                            );
                          }}
                        >
                          {text}
                          <Pencil size={10} strokeWidth={2} />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {text}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {/* The reason sits under its own row rather than in the status
                column: it is a sentence, and squeezing it beside the summary
                would wrap both into something unreadable on a phone. */}
            {/* No retry control. Retrying one row used to mean a second cart
                call outside the proposal, which a single-use proposal does not
                allow; the guest asks the assistant instead, and gets an
                alternative that is valid now rather than the same failure. */}
            {row.failure ? (
              <span className="text-xs text-destructive">
                {tDefault(
                  FAILURE_LABELS[row.failure.kind].key,
                  FAILURE_LABELS[row.failure.kind].fallback,
                )}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      {/* What is still waiting, named. The picker below asks one at a time,
          which is right for answering and leaves the guest unable to see how
          much is left — with a single choice open it shows no count at all.

          Written here, from the proposal's own choices, and deliberately not
          asked of the assistant: it has to be exactly right, and one owner is
          what stops the guest reading the same thing twice. Styled as the
          panel's own words rather than as a reply, for the same reason. */}
      {proposal.openChoiceLabels.length > 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {tDefault('guest.assistant.choicesToPick', 'Still to choose: {{labels}}', {
            labels: proposal.openChoiceLabels.join('、'),
          })}
        </p>
      ) : null}

      {picker ? (
        <ChoicePicker
          // Keyed by the choice, so the picks made for one never carry over to
          // the next one shown in the same place.
          key={`${picker.operationId}:${picker.modifierId}`}
          choice={picker}
          // Only the queue has a count. A choice opened to change is not one of
          // the ones still waiting.
          remainingCount={
            edited ? 1 : (proposal.openChoice?.remainingCount ?? 1)
          }
          disabled={isApplying}
          onAnswer={(optionIds) => {
            onAnswerChoice({
              operationId: picker.operationId,
              modifierId: picker.modifierId,
              optionIds,
            });
            setEditing(null);
          }}
        />
      ) : null}

      {proposal.showsConfirmationControls && proposal.canApply ? (
        <Button
          variant="storefront"
          className="mt-3 w-full shrink-0"
          disabled={isApplying}
          onClick={onApply}
        >
          {tDefault('guest.assistant.applyProposal', 'Add these to my cart')}
        </Button>
      ) : null}
    </div>
  );
}

type ChoicePickerProps = {
  choice: AssistantChoicePickerView;
  remainingCount: number;
  disabled: boolean;
  onAnswer: (optionIds: string[]) => void;
};

/**
 * The card's one picker: a single choice and its options.
 *
 * A choice that takes one answer is answered by the tap. One that takes several
 * toggles, and is answered by the button, because there is no telling from a
 * tap whether the guest is finished. What is ticked before that button is a
 * draft and lives here; the rules for it — the maximum, when it may be
 * confirmed — are the view's.
 */
function ChoicePicker({
  choice,
  remainingCount,
  disabled,
  onAnswer,
}: ChoicePickerProps) {
  const { tDefault } = useAppTranslation();
  const [draft, setDraft] = useState(choice.selectedOptionIds);
  const selected = choice.isMultiSelect ? draft : choice.selectedOptionIds;

  return (
    <div className="mt-3 shrink-0 border-t border-storefront-border pt-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">
          {choice.label}
          {choice.isRequired ? null : (
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {tDefault('guest.assistant.choiceOptional', 'optional')}
            </span>
          )}
          {choice.isMultiSelect ? (
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {tDefault('guest.assistant.choiceMax', 'up to {{count}}', {
                count: choice.maxSelect,
              })}
            </span>
          ) : null}
        </span>
        {remainingCount > 1 ? (
          <span className="text-xs text-muted-foreground">
            {tDefault('guest.assistant.choicesRemaining', '{{count}} left', {
              count: remainingCount,
            })}
          </span>
        ) : null}
      </div>

      <p className="mb-2 text-xs text-muted-foreground">{choice.itemSummary}</p>

      <div className="flex flex-wrap gap-2">
        {choice.options.map((option) => {
          const isSelected = selected.includes(option.id);

          return (
            <Button
              key={option.id}
              type="button"
              variant={isSelected ? 'storefront' : 'outline'}
              size="sm"
              aria-pressed={isSelected}
              disabled={disabled}
              onClick={() => {
                if (choice.isMultiSelect) {
                  setDraft(toggleChoiceOption(choice, draft, option.id));
                } else {
                  onAnswer([option.id]);
                }
              }}
            >
              {option.label}
              {option.priceAdjustment !== 0 ? (
                <span className="ml-1 text-xs opacity-70">
                  +{option.priceAdjustment}
                </span>
              ) : null}
            </Button>
          );
        })}

        {/* Declining is an answer, and it is the one an optional choice needs:
            without it the queue would never empty and the guest could not
            reach the button. It also clears an extra the assistant added. */}
        {choice.isMultiSelect || choice.isRequired ? null : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => {
              onAnswer([]);
            }}
          >
            {tDefault('guest.assistant.declineChoice', 'No thanks')}
          </Button>
        )}

        {choice.isMultiSelect ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || !canConfirmChoice(choice, draft)}
            onClick={() => {
              onAnswer(draft);
            }}
          >
            {/* Confirming nothing is declining, and reads as that. */}
            {draft.length === 0 && !choice.isRequired
              ? tDefault('guest.assistant.declineChoice', 'No thanks')
              : tDefault('guest.assistant.confirmChoice', 'Done')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
