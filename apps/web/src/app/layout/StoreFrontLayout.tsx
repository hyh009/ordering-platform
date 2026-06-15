import { Outlet } from 'react-router';
import { PageErrorBoundary } from '@/app/error/AppErrorBoundary';
import { useFeedbackVM } from '@/app/global/feedback/useFeedbackVM';
import { useAppTranslation } from '@/app/i18n';
import { ModalHost } from '@/shared/components/feedback/ModalHost';
import { ToastHost } from '@/shared/components/feedback/ToastHost';

/**
 * Mobile-first shell for the public storefront ordering flow. Unlike the merchant
 * layouts it has no auth, sidebar, or merchant header — storefront pages own their
 * own headers.
 */
export function StoreFrontLayout() {
  const feedback = useFeedbackVM();
  const { tDefault } = useAppTranslation();

  return (
    <div className="h-dvh w-full overflow-y-auto bg-storefront-bg">
      <div className="mx-auto flex min-h-full w-full max-w-(--storefront-layout-max-w) flex-col">
        <PageErrorBoundary>
          <Outlet />
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
    </div>
  );
}
