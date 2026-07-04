import { Suspense } from 'react';
import { matchPath, useLocation, useNavigate, useParams, Outlet } from 'react-router';
import { PageErrorBoundary } from '@/app/error/AppErrorBoundary';
import { useFeedbackVM } from '@/app/global/feedback/useFeedbackVM';
import { useAppTranslation } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import { StorefrontChunkFallback } from '@/features/storeFront/components/StorefrontChunkFallback';
import { StorefrontLanguageDialog } from '@/features/storeFront/components/StorefrontLanguageDialog';
import { useStorefrontLanguagePrompt } from '@/features/storeFront/components/useStorefrontLanguagePrompt';
import { ModalHost } from '@/shared/components/feedback/ModalHost';
import { ToastHost } from '@/shared/components/feedback/ToastHost';
import { useStoreFrontLayoutVM } from './useStoreFrontLayoutVM';

// Routes whose page renders a header. Landing and join intentionally show none,
// so their chunk-loading fallback stays headerless too.
const HEADER_ROUTES = [
  PATHS.STOREFRONT.MENU,
  PATHS.STOREFRONT.INVITE,
  PATHS.STOREFRONT.CART,
  PATHS.STOREFRONT.ORDER_HISTORY,
  PATHS.STOREFRONT.ORDER,
];

/**
 * Mobile-first shell for the public storefront ordering flow. Unlike the merchant
 * layouts it has no auth, sidebar, or merchant header — storefront pages own their
 * own headers. The layout loads the store record so a matching header shell can
 * stand in while a page chunk loads (see `StorefrontChunkFallback`).
 */
export function StoreFrontLayout() {
  const feedback = useFeedbackVM();
  const { tDefault } = useAppTranslation();
  const lang = useStorefrontLanguagePrompt();
  const navigate = useNavigate();
  const location = useLocation();
  const { storeId } = useParams<{ storeId: string }>();
  // Owns the guest SSE stream (shared across navigation without reconnect churn)
  // and the store record backing the persistent header.
  const { store } = useStoreFrontLayoutVM();

  const showHeaderFallback = HEADER_ROUTES.some((pattern) =>
    matchPath(pattern, location.pathname),
  );

  return (
    <div className="h-dvh w-full overflow-y-auto bg-storefront-bg">
      <div className="flex min-h-full w-full flex-col">
        <PageErrorBoundary>
          <Suspense
            fallback={
              <StorefrontChunkFallback
                store={store}
                showHeader={showHeaderFallback}
                onBack={() => {
                  void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId ?? ''));
                }}
              />
            }
          >
            <Outlet />
          </Suspense>
        </PageErrorBoundary>
        <ToastHost
          dismissLabel={tDefault(
            'app.feedback.dismissNotification',
            'Dismiss notification',
          )}
          onDismiss={feedback.dismissToast}
          toasts={feedback.toasts}
        />
        <ModalHost
          modal={feedback.modal}
          onCancel={() => {
            feedback.closeModal(false);
          }}
          onConfirm={() => {
            feedback.closeModal(true);
          }}
        />
      </div>
      <StorefrontLanguageDialog
        open={lang.open}
        options={lang.supportedOptions}
        onSelect={lang.handleSelect}
        onOpenChange={lang.onOpenChange}
      />
    </div>
  );
}
