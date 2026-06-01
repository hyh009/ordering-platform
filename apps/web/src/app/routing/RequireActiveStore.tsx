import { Navigate, Outlet } from 'react-router';
import { useStore } from 'zustand';
import { activeOrgStore } from '@/app/global/activeOrg/activeOrg.store';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { PATHS } from './paths';

export function RequireActiveStore() {
  const organizationId = useStore(activeOrgStore, (s) => s.organizationId);
  const storeId = useStore(activeStoreStore, (s) => s.storeId);

  if (!organizationId) {
    return <Navigate replace to={PATHS.MERCHANT.SELECT_ORG} />;
  }

  if (!storeId) {
    return <Navigate replace to={PATHS.MERCHANT.SELECT_STORE} />;
  }

  return <Outlet />;
}
