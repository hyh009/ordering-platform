import { useAppTranslation } from '@/app/i18n';
import errorIllustrationUrl from '@/assets/storeFront/img_error.png';
import { Button } from '@/shared/components/ui/button';

interface StorefrontErrorViewProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * @reusable
 * @description Full-page storefront error state with illustration, message, and an optional retry action.
 * @keywords error, retry, failure, load error, empty state, illustration
 */
export function StorefrontErrorView({
  message,
  onRetry,
  retryLabel,
}: StorefrontErrorViewProps) {
  const { tDefault } = useAppTranslation();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <img
        src={errorIllustrationUrl}
        alt=""
        aria-hidden
        className="h-40 w-auto max-w-full object-contain"
      />
      <p className="text-storefront-text-muted">{message}</p>
      {onRetry ? (
        <Button variant="storefront" onClick={onRetry}>
          {retryLabel ?? tDefault('common.retry', 'Try again')}
        </Button>
      ) : null}
    </div>
  );
}
