import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/utils/cn';

type Option = { id: string; label: string };

type Question = {
  question: string;
  options: Option[];
};

/**
 * The questions one reply asked, answered one at a time.
 *
 * A tap answers the question on screen and moves to the next one still
 * unanswered; the tap that leaves none sends them all. Which option is picked
 * for each question is held here and nowhere else: it means nothing until it is
 * sent, and is gone once it is.
 *
 * Every question is laid out in the same grid cell with only the current one
 * visible, so the block is as tall as its tallest question from the start and
 * stepping through them moves nothing around it.
 */
export function AssistantQuestionStepper({
  questions,
  allowsFreeText,
  disabled,
  onAnswerOne,
  onAnswerAll,
}: {
  questions: Question[];
  allowsFreeText: boolean;
  disabled: boolean;
  /** A lone question: the option goes with its id. */
  onAnswerOne: (option: Option) => void;
  /** Several questions: the picked labels, in question order. */
  onAnswerAll: (labels: string[]) => void;
}) {
  const { tDefault } = useAppTranslation();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<Record<number, Option>>({});

  const pick = (index: number, option: Option) => {
    if (questions.length === 1) {
      onAnswerOne(option);
      return;
    }

    const next = { ...picked, [index]: option };
    setPicked(next);

    // After going back to change an answer, this skips the ones already given
    // rather than making the guest tap through them again.
    const unanswered = questions.findIndex(
      (_, candidate) => next[candidate] === undefined,
    );

    if (unanswered === -1) {
      onAnswerAll(questions.map((_, candidate) => next[candidate]!.label));
      return;
    }

    setStep(unanswered);
  };

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="grid min-h-0 overflow-y-auto">
        {questions.map((question, index) => (
          <div
            key={index}
            // `invisible` keeps the height and takes the hidden questions out
            // of the tab order and the accessibility tree.
            className={cn(
              'col-start-1 row-start-1 space-y-2',
              index !== step && 'invisible',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">{question.question}</p>
              {questions.length > 1 ? (
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {index + 1} / {questions.length}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {question.options.map((option) => (
                <Button
                  key={option.id}
                  variant={
                    picked[index]?.id === option.id ? 'default' : 'outline'
                  }
                  size="sm"
                  aria-pressed={picked[index]?.id === option.id}
                  disabled={disabled}
                  onClick={() => {
                    pick(index, option);
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3">
        {/* Kept in the layout on the first question, hidden, so the row is the
            same height on every step. */}
        {questions.length > 1 ? (
          <Button
            variant="ghost"
            size="sm"
            className={cn('-ml-2', step === 0 && 'invisible')}
            disabled={disabled}
            onClick={() => {
              setStep((current) => Math.max(0, current - 1));
            }}
          >
            <ChevronLeft size={14} strokeWidth={2} />
            {tDefault('guest.assistant.previousQuestion', 'Previous question')}
          </Button>
        ) : null}
        {allowsFreeText ? (
          <p className="text-xs text-muted-foreground">
            {tDefault(
              'guest.assistant.freeTextHint',
              'Or just type what you want instead.',
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}
