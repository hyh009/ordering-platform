import { useAppTranslation } from '@/app/i18n';
import { Button } from '@/shared/components/ui/button';

interface StorefrontErrorViewProps {
  message: string;
  onRetry?: () => void;
}

export function StorefrontErrorView({ message, onRetry }: StorefrontErrorViewProps) {
  const { tDefault } = useAppTranslation();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-storefront-text-muted">{message}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          {tDefault('common.retry', 'Try again')}
        </Button>
      ) : null}
    </div>
  );
}
