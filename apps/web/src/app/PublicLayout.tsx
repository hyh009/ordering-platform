import { Outlet, useNavigate } from 'react-router';
import { apiBaseUrl, apiUrl } from '@/api';
import { healthPaths } from '@/api/paths/health.paths';
import { PageErrorBoundary } from '@/app/AppErrorBoundary';
import { useAppContextVM } from '@/app/viewModel/useAppContextVM';
import { useFeedbackVM } from '@/app/viewModel/useFeedbackVM';
import { useLanguageVM } from '@/app/viewModel/useLanguageVM';
import { ModalHost } from '@/shared/components/feedback/ModalHost';
import { ToastHost } from '@/shared/components/feedback/ToastHost';
import { AppShell } from '@/shared/components/layout/AppShell';

export function PublicLayout() {
  const appContext = useAppContextVM();
  const feedback = useFeedbackVM();
  const language = useLanguageVM();
  const navigate = useNavigate();

  function navigateHome() {
    navigate('/login');
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
      <ToastHost
        onDismiss={feedback.actions.dismissToast}
        toasts={feedback.toasts}
      />
      <ModalHost
        modal={feedback.modal}
        onCancel={() => {
          feedback.actions.closeModal(false);
        }}
        onConfirm={() => {
          feedback.actions.closeModal(true);
        }}
      />
    </AppShell>
  );
}
