import { Navigate, Outlet, useLocation } from 'react-router';
import { useAppTranslation } from '@/app/i18n';
import { useAuthVM } from '@/app/viewModel/useAuthVM';
import { LoadingState } from '@/shared/components/LoadingState';

export function RequireAuth() {
  const auth = useAuthVM();
  const location = useLocation();
  const { tDefault } = useAppTranslation();

  if (auth.isChecking) {
    return (
      <LoadingState
        label={tDefault('app.loading.checkingSession', 'Checking session')}
      />
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <Outlet />;
}
