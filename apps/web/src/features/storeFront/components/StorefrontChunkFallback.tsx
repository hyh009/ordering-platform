import { ArrowLeft } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { StorefrontLoadingView } from './StorefrontLoadingView';

type StorefrontChunkFallbackProps = {
  /** Whether the routed page shows a header (false on landing/join). */
  showHeader: boolean;
  /** Back affordance while the page chunk loads; the page owns the real one. */
  onBack: () => void;
};

/**
 * Suspense fallback for lazily-loaded storefront pages. It keeps a header bar on
 * screen while the page's JS chunk downloads (e.g. on a hard refresh) instead of
 * blanking the whole shell. No page — and therefore no store data — is mounted
 * yet, so the title and logo render as pulsing skeletons sized to match the real
 * header; the page swaps in its own header once mounted.
 */
export function StorefrontChunkFallback({
  showHeader,
  onBack,
}: StorefrontChunkFallbackProps) {
  const { tDefault } = useAppTranslation();

  return (
    <div className="flex flex-1 flex-col">
      {showHeader ? (
        <header className="sticky top-0 z-sticky border-b border-storefront-border bg-storefront-bg">
          <div className="grid grid-cols-[2rem_1fr_2rem] items-center px-4 py-2 sm:py-3">
            <button
              aria-label={tDefault('common.back', 'Back')}
              className="flex h-8 w-8 items-center justify-center rounded-full text-storefront-text hover:bg-storefront-border/60"
              type="button"
              onClick={onBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div
              aria-hidden
              className="mx-auto h-4 w-32 animate-pulse rounded bg-storefront-border"
            />
            <div
              aria-hidden
              className="h-8 w-8 animate-pulse justify-self-end rounded-full bg-storefront-border"
            />
          </div>
        </header>
      ) : null}
      <StorefrontLoadingView />
    </div>
  );
}
