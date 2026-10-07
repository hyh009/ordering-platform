import { useAppTranslation } from '@/app/i18n';
import { Button } from '@/shared/components/ui/button';

type Option = { id: string; label: string };

/**
 * The one question a reply asked, answered by a single tap.
 *
 * One question, never several. Carrying several was tried: the model used the
 * second slot to continue the first question's options past their cap, the
 * guest was then made to answer both, and the two answers travelled as one text
 * message — which ordered two products when they wanted one. A tap now answers
 * the whole thing and sends the option's own id, so nothing has to be held here
 * between taps and the answer never degrades to text.
 */
export function AssistantQuestionCard({
  question,
  options,
  allowsFreeText,
  disabled,
  onAnswer,
}: {
  question: string;
  options: Option[];
  allowsFreeText: boolean;
  disabled: boolean;
  onAnswer: (option: Option) => void;
}) {
  const { tDefault } = useAppTranslation();

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="min-h-0 space-y-2 overflow-y-auto">
        <p className="text-sm font-medium">{question}</p>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <Button
              key={option.id}
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => {
                onAnswer(option);
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {allowsFreeText ? (
        <p className="shrink-0 text-xs text-muted-foreground">
          {tDefault(
            'guest.assistant.freeTextHint',
            'Or just type what you want instead.',
          )}
        </p>
      ) : null}
    </div>
  );
}
