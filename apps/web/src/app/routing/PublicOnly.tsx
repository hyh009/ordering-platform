import { Navigate, Outlet } from 'react-router';
import { useAuthVM } from '@/app/global/auth/useAuthVM';
import { useAppTranslation } from '@/app/i18n';
import { LoadingState } from '@/shared/components/LoadingState';

export function PublicOnly() {
  const auth = useAuthVM();
  const { tDefault } = useAppTranslation();

  if (auth.isChecking) {
    return (
      <LoadingState
        label={tDefault('app.loading.checkingSession', 'Checking session')}
      />
    );
  }

  if (auth.isAuthenticated) {
    return (
      <Navigate
        replace
        to={auth.user?.isSuperAdmin ? '/admin/organizations' : '/home'}
      />
    );
  }

  return <Outlet />;
}
