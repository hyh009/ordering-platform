import { Navigate, Outlet } from 'react-router';
import { useAppTranslation } from '@/app/i18n';
import { useAuthVM } from '@/app/viewModel/useAuthVM';
import { LoadingState } from '@/shared/components/LoadingState';

export function RequireSuperAdmin() {
  const auth = useAuthVM();
  const { tDefault } = useAppTranslation();

  if (auth.isChecking) {
    return (
      <LoadingState
        label={tDefault('app.loading.checkingSession', 'Checking session')}
      />
    );
  }

  if (!auth.user?.isSuperAdmin) {
    return <Navigate replace to="/home" />;
  }

  return <Outlet />;
}
