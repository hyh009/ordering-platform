import { Navigate, Outlet } from 'react-router';
import { useCanManageStoreResources } from '@/app/global/activeOrg/useActiveOrgRole';
import { useAuthVM } from '@/app/global/auth/useAuthVM';
import { useAppTranslation } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import { LoadingState } from '@/shared/components/LoadingState';

type RequireStoreManagerProps = {
  redirectTo?: string;
};

/**
 * Gates manager-only routes (e.g. resource create pages) that have no read-only
 * mode. Staff are redirected away rather than shown an editable form they can
 * never submit. Read/list pages stay open to staff and gate editing in-page via
 * `useCanManageStoreResources`.
 */
export function RequireStoreManager({
  redirectTo = PATHS.MERCHANT.MENU,
}: RequireStoreManagerProps) {
  const auth = useAuthVM();
  const { tDefault } = useAppTranslation();
  const canManage = useCanManageStoreResources();

  if (auth.isChecking) {
    return (
      <LoadingState
        label={tDefault('app.loading.checkingSession', 'Checking session')}
      />
    );
  }

  if (!canManage) {
    return <Navigate replace to={redirectTo} />;
  }

  return <Outlet />;
}
