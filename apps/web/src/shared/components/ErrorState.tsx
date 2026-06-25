import { CircleAlert } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n';
import { Button } from '@/shared/components/ui/button';

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

/**
 * @reusable
 * @description Full-page dashboard error state with message and an optional retry action.
 * @keywords error, retry, failure, load error, page state
 */
export function ErrorState({ message, onRetry, retryLabel }: ErrorStateProps) {
  const { tDefault } = useAppTranslation();

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
      role="alert"
    >
      <CircleAlert className="h-8 w-8 text-destructive" aria-hidden />
      <p className="text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel ?? tDefault('common.retry', 'Try again')}
        </Button>
      ) : null}
    </div>
  );
}
