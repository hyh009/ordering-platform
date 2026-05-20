import { Outlet, useNavigate } from 'react-router';
import { apiBaseUrl, apiUrl } from '@/api';
import { healthPaths } from '@/api/paths/health.paths';
import { PageErrorBoundary } from '@/app/error/AppErrorBoundary';
import { useAppContextVM } from '@/app/global/appContext/useAppContextVM';
import { useFeedbackVM } from '@/app/global/feedback/useFeedbackVM';
import { useLanguageVM } from '@/app/i18n/useLanguageVM';
import { ModalHost } from '@/shared/components/feedback/ModalHost';
import { ToastHost } from '@/shared/components/feedback/ToastHost';
import { AppShell } from '@/app/layout/AppShell';

export function PublicLayout() {
  const appContext = useAppContextVM();
  const feedback = useFeedbackVM();
  const language = useLanguageVM();
  const navigate = useNavigate();

  function navigateHome() {
    navigate('/admin/login');
  }

  return (
    <AppShell
      appName={appContext.appName}
      healthUrl={apiUrl(healthPaths.status)}
      isAuthenticated={false}
      language={language.currentLanguage}
      languageOptions={language.languageOptions}
      onLanguageChange={language.changeLanguage}
      onLogout={() => {}}
      onNavigateHome={navigateHome}
      swaggerUrl={`${apiBaseUrl}/docs`}
    >
      <PageErrorBoundary>
        <Outlet />
      </PageErrorBoundary>
      <ToastHost onDismiss={feedback.dismissToast} toasts={feedback.toasts} />
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
