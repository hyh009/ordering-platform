import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { RouteErrorBoundary } from '@/app/error/AppErrorBoundary';
import { useAuthVM } from '@/app/global/auth/useAuthVM';
import { AppLayout, MerchantLayout, SuperAdminLayout } from '@/app/layout/AppLayout';
import { PublicLayout } from '@/app/layout/PublicLayout';
import { PATHS } from '@/app/routing/paths';
import { PublicOnly } from '@/app/routing/PublicOnly';
import { RequireActiveStore } from '@/app/routing/RequireActiveStore';
import { RequireAuth } from '@/app/routing/RequireAuth';
import { RequireSuperAdmin } from '@/app/routing/RequireSuperAdmin';
import { AllergenListPage } from '@/pages/admin/allergenList/AllergenListPage';
import { DietaryMarkerListPage } from '@/pages/admin/dietaryMarkerList/DietaryMarkerListPage';
import { OrganizationDetailPage } from '@/pages/admin/organizationDetail/OrganizationDetailPage';
import { OrganizationListPage } from '@/pages/admin/organizationList/OrganizationListPage';
import { OrganizationMembershipsPage } from '@/pages/admin/organizationMemberships/OrganizationMembershipsPage';
import { StoreCreatePage } from '@/pages/admin/storeCreate/StoreCreatePage';
import { StoreListPage } from '@/pages/admin/storeList/StoreListPage';
import { LoginPage } from '@/pages/login/LoginPage';
import { CategoryListPage } from '@/pages/merchant/categoryList/CategoryListPage';
import { MenuPage } from '@/pages/merchant/menu/MenuPage';
import { OrderListPage } from '@/pages/merchant/orderList/OrderListPage';
import { OrgSelectPage } from '@/pages/merchant/orgSelect/OrgSelectPage';
import { StoreSelectPage } from '@/pages/merchant/storeSelect/StoreSelectPage';
import { StoreSettingsPage } from '@/pages/merchant/storeSettings/StoreSettingsPage';
import { TagListPage } from '@/pages/merchant/tagList/TagListPage';
import { NotFoundPage } from '@/pages/notFound/NotFoundPage';

export function App() {
  const auth = useAuthVM();
  const initializeAuth = auth.initialize;

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RouteErrorBoundary />}>
          <Route element={<PublicOnly />}>
            <Route element={<PublicLayout />}>
              <Route element={<LoginPage />} path={PATHS.AUTH.LOGIN} />
            </Route>
          </Route>

          <Route element={<RequireAuth />}>
            <Route
              element={
                <Navigate
                  replace
                  to={
                    auth.user?.isSuperAdmin
                      ? PATHS.SUPER_ADMIN.ORGANIZATIONS
                      : PATHS.MERCHANT.SELECT_ORG
                  }
                />
              }
              index
            />

            {/* Super admin platform: /admin/* with sidebar */}
            <Route element={<SuperAdminLayout />}>
              <Route element={<RequireSuperAdmin />}>
                <Route
                  element={
                    <Navigate replace to={PATHS.SUPER_ADMIN.ORGANIZATIONS} />
                  }
                  path={PATHS.SUPER_ADMIN.ROOT}
                />
                <Route
                  element={
                    <Navigate replace to={PATHS.SUPER_ADMIN.ORGANIZATIONS} />
                  }
                  path={PATHS.SUPER_ADMIN.OVERVIEW}
                />
                <Route
                  element={<OrganizationListPage />}
                  path={PATHS.SUPER_ADMIN.ORGANIZATIONS}
                />
                <Route
                  element={<OrganizationDetailPage />}
                  path={PATHS.SUPER_ADMIN.ORGANIZATION_DETAIL}
                />
                <Route
                  element={<OrganizationMembershipsPage />}
                  path={PATHS.SUPER_ADMIN.ORGANIZATION_MEMBERSHIPS}
                />
                <Route
                  element={<StoreListPage />}
                  path={PATHS.SUPER_ADMIN.STORE_LIST}
                />
                <Route
                  element={<StoreCreatePage />}
                  path={PATHS.SUPER_ADMIN.STORE_CREATE}
                />
                <Route
                  element={<AllergenListPage />}
                  path={PATHS.SUPER_ADMIN.ALLERGENS}
                />
                <Route
                  element={<DietaryMarkerListPage />}
                  path={PATHS.SUPER_ADMIN.DIETARY_MARKERS}
                />
                <Route element={<NotFoundPage embedded />} path="/admin/*" />
              </Route>
            </Route>

            {/* Merchant selection: no sidebar */}
            <Route element={<AppLayout />}>
              <Route
                element={
                  <Navigate replace to={PATHS.MERCHANT.SELECT_ORG} />
                }
                path={PATHS.MERCHANT.ROOT}
              />
              <Route element={<OrgSelectPage />} path={PATHS.MERCHANT.SELECT_ORG} />
              <Route element={<StoreSelectPage />} path={PATHS.MERCHANT.SELECT_STORE} />
            </Route>

            {/* Merchant platform: /merchant/* with sidebar */}
            <Route element={<MerchantLayout />}>
              {/* Store-scoped pages require active org and store selection */}
              <Route element={<RequireActiveStore />}>
                <Route element={<MenuPage />} path={PATHS.MERCHANT.MENU} />
                <Route element={<OrderListPage />} path={PATHS.MERCHANT.ORDERS} />
                <Route
                  element={<StoreSettingsPage />}
                  path={PATHS.MERCHANT.STORE_SETTINGS}
                />
                <Route
                  element={<CategoryListPage />}
                  path={PATHS.MERCHANT.CATEGORIES}
                />
                <Route element={<TagListPage />} path={PATHS.MERCHANT.TAGS} />
              </Route>

              <Route element={<NotFoundPage embedded />} path="/merchant/*" />
            </Route>

            {/* Catch-all 404 */}
            <Route element={<AppLayout />}>
              <Route element={<NotFoundPage embedded />} path="*" />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
