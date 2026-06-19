import { Outlet } from 'react-router';
import { PageErrorBoundary } from '@/app/error/AppErrorBoundary';
import { useFeedbackVM } from '@/app/global/feedback/useFeedbackVM';
import { useAppTranslation } from '@/app/i18n';
import { StorefrontLanguageDialog } from '@/features/storeFront/components/StorefrontLanguageDialog';
import { useStorefrontLanguagePrompt } from '@/features/storeFront/components/useStorefrontLanguagePrompt';
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
  const lang = useStorefrontLanguagePrompt();

  return (
    <div className="h-dvh w-full overflow-y-auto bg-storefront-bg">
      <div className="flex min-h-full w-full flex-col">
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
      <StorefrontLanguageDialog
        open={lang.open}
        options={lang.supportedOptions}
        onSelect={lang.handleSelect}
        onOpenChange={lang.onOpenChange}
      />
    </div>
  );
}
