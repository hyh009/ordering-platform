import { Outlet } from 'react-router';
import { PageErrorBoundary } from '@/app/error/AppErrorBoundary';
import { useAppContextVM } from '@/app/global/appContext/useAppContextVM';
import { useFeedbackVM } from '@/app/global/feedback/useFeedbackVM';
import { useAppTranslation } from '@/app/i18n';
import { useLanguageVM } from '@/app/i18n/useLanguageVM';
import { ModalHost } from '@/shared/components/feedback/ModalHost';
import { ToastHost } from '@/shared/components/feedback/ToastHost';
import { AppShell } from '@/app/layout/AppShell';

export function PublicLayout() {
  const appContext = useAppContextVM();
  const feedback = useFeedbackVM();
  const language = useLanguageVM();
  const { tDefault } = useAppTranslation();

  return (
    <AppShell
      appName={appContext.appName}
      isAuthenticated={false}
      language={language.currentLanguage}
      languageOptions={language.languageOptions}
      onLanguageChange={language.changeLanguage}
      onLogout={() => {}}
    >
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
    </AppShell>
  );
}
