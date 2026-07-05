import { ArrowLeft } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import {
  StorefrontHeaderShell,
  storefrontHeaderButtonClass,
} from './StorefrontHeaderShell';
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
        <StorefrontHeaderShell
          sticky
          left={
            <button
              aria-label={tDefault('common.back', 'Back')}
              className={storefrontHeaderButtonClass}
              type="button"
              onClick={onBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          }
          middle={
            <div className="h-4 w-32 animate-pulse rounded bg-storefront-border" />
          }
          right={
            <div className="h-8 w-8 animate-pulse rounded-full bg-storefront-border" />
          }
        />
      ) : null}
      <StorefrontLoadingView />
    </div>
  );
}
