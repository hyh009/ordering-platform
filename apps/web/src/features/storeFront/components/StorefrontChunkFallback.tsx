import type { PublicStore } from '@/models/storeFrontMenu';
import { StorefrontLoadingView } from './StorefrontLoadingView';
import { StorefrontPageHeader } from './StorefrontPageHeader';
import { useLocalizedText } from './useLocalizedText';

type StorefrontChunkFallbackProps = {
  /** Store record (from the layout) used for the header logo and name. */
  store: PublicStore | null;
  /** Whether the routed page shows a header (false on landing/join). */
  showHeader: boolean;
  /** Back affordance while the page chunk loads; the page owns the real one. */
  onBack: () => void;
};

/**
 * Suspense fallback for lazily-loaded storefront pages. It mirrors a page's
 * loading state — the sticky header shell plus a spinner — so the header stays
 * on screen while the page's JS chunk downloads (e.g. on a hard refresh),
 * instead of the whole shell blanking out. The page renders its own identical
 * header once mounted, so the swap is seamless.
 */
export function StorefrontChunkFallback({
  store,
  showHeader,
  onBack,
}: StorefrontChunkFallbackProps) {
  const localize = useLocalizedText();
  const storeName = store ? localize(store.displayName) : undefined;

  return (
    <div className="flex flex-1 flex-col">
      {showHeader ? (
        <StorefrontPageHeader
          sticky
          left={StorefrontPageHeader.Left.Back}
          middle={StorefrontPageHeader.Middle.Title}
          right={StorefrontPageHeader.Right.Logo}
          title={storeName}
          onBack={onBack}
          logoUrl={store?.logoUrl}
          logoAlt={storeName}
        />
      ) : null}
      <StorefrontLoadingView />
    </div>
  );
}
