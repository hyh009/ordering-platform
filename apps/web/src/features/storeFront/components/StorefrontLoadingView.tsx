import { Spinner } from '@/shared/components/ui/spinner';

export function StorefrontLoadingView() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Spinner className="h-8 w-8 text-storefront-primary" />
    </div>
  );
}
