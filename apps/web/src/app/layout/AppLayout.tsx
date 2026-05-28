import type { ReactNode } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { PageErrorBoundary } from '@/app/error/AppErrorBoundary';
import { useAppContextVM } from '@/app/global/appContext/useAppContextVM';
import { useAuthVM } from '@/app/global/auth/useAuthVM';
import { useFeedbackVM } from '@/app/global/feedback/useFeedbackVM';
import { useAppTranslation } from '@/app/i18n';
import { useLanguageVM } from '@/app/i18n/useLanguageVM';
import { PATHS } from '@/app/routing/paths';
import { ModalHost } from '@/shared/components/feedback/ModalHost';
import { ToastHost } from '@/shared/components/feedback/ToastHost';
import { AppShell } from '@/app/layout/AppShell';
import { MerchantSidebar } from '@/app/layout/MerchantSidebar';
import { SuperAdminSidebar } from '@/app/layout/SuperAdminSidebar';

const envLabel: Record<string, string> = {
  development: 'Local',
  staging: 'Staging',
  production: 'Production',
};

export function createAuthenticatedLayout(sidebar?: ReactNode) {
  return function AuthenticatedLayout() {
    const appContext = useAppContextVM();
    const feedback = useFeedbackVM();
    const language = useLanguageVM();
    const { tDefault } = useAppTranslation();
    const navigate = useNavigate();
    const auth = useAuthVM({
      onLoggedOut() {
        navigate(PATHS.AUTH.LOGIN, { replace: true });
      },
    });

    return (
      <AppShell
        appName={appContext.appName}
        environment={envLabel[import.meta.env.MODE] ?? import.meta.env.MODE}
        isAuthenticated
        isSuperAdmin={auth.user?.isSuperAdmin ?? false}
        language={language.currentLanguage}
        languageOptions={language.languageOptions}
        onLanguageChange={language.changeLanguage}
        onLogout={() => {
          void auth.logout();
        }}
        sidebar={sidebar}
        username={auth.user?.username}
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
  };
}

export const AppLayout = createAuthenticatedLayout();
export const SuperAdminLayout = createAuthenticatedLayout(<SuperAdminSidebar />);
export const MerchantLayout = createAuthenticatedLayout(<MerchantSidebar />);
