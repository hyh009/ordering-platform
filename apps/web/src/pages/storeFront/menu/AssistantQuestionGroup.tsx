import { useState } from 'react';

import { useAppTranslation } from '@/app/i18n';
import { Button } from '@/shared/components/ui/button';

type Question = {
  question: string;
  options: { id: string; label: string }[];
};

/**
 * Several questions asked in one turn, answered together.
 *
 * Which option is picked for each question is held here and nowhere else: it is
 * what the guest has tapped so far, means nothing until they send it, and is
 * gone once they do. The answer leaves as the picked labels, in question order.
 */
export function AssistantQuestionGroup({
  questions,
  disabled,
  onSubmit,
}: {
  questions: Question[];
  disabled: boolean;
  onSubmit: (labels: string[]) => void;
}) {
  const { tDefault } = useAppTranslation();
  const [picked, setPicked] = useState<Record<number, string>>({});

  const labels = questions.map((question, index) => {
    const option = question.options.find(
      (candidate) => candidate.id === picked[index],
    );

    return option?.label;
  });
  const isComplete = labels.every((label) => label !== undefined);

  return (
    <div className="space-y-3">
      {questions.map((question, index) => (
        <div key={index} className="space-y-2">
          <p className="text-sm font-medium">{question.question}</p>
          <div className="flex flex-wrap gap-2">
            {question.options.map((option) => (
              <Button
                key={option.id}
                variant={picked[index] === option.id ? 'default' : 'outline'}
                size="sm"
                aria-pressed={picked[index] === option.id}
                disabled={disabled}
                onClick={() => {
                  setPicked((current) => ({ ...current, [index]: option.id }));
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      ))}

      <Button
        size="sm"
        disabled={disabled || !isComplete}
        onClick={() => {
          onSubmit(labels.filter((label) => label !== undefined));
        }}
      >
        {tDefault('guest.assistant.sendAnswers', 'Send')}
      </Button>
    </div>
  );
}
