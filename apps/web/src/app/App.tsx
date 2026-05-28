import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { RouteErrorBoundary } from '@/app/error/AppErrorBoundary';
import { useAuthVM } from '@/app/global/auth/useAuthVM';
import { AppLayout, MerchantLayout, SuperAdminLayout } from '@/app/layout/AppLayout';
import { PublicLayout } from '@/app/layout/PublicLayout';
import { PATHS } from '@/app/routing/paths';
import { PublicOnly } from '@/app/routing/PublicOnly';
import { RequireAuth } from '@/app/routing/RequireAuth';
import { RequireSuperAdmin } from '@/app/routing/RequireSuperAdmin';
import { AllergenListPage } from '@/pages/allergenList/AllergenListPage';
import { CategoryListPage } from '@/pages/categoryList/CategoryListPage';
import { DietaryMarkerListPage } from '@/pages/dietaryMarkerList/DietaryMarkerListPage';
import { LoginPage } from '@/pages/login/LoginPage';
import { MenuPage } from '@/pages/menu/MenuPage';
import { NotFoundPage } from '@/pages/notFound/NotFoundPage';
import { OrderListPage } from '@/pages/orderList/OrderListPage';
import { OrganizationDetailPage } from '@/pages/organizationDetail/OrganizationDetailPage';
import { OrganizationListPage } from '@/pages/organizationList/OrganizationListPage';
import { StoreSettingsPage } from '@/pages/storeSettings/StoreSettingsPage';
import { TagListPage } from '@/pages/tagList/TagListPage';

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
                      : PATHS.MERCHANT.MENU
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

            {/* Merchant platform: /merchant/* with sidebar */}
            <Route element={<MerchantLayout />}>
              <Route
                element={
                  <Navigate replace to={PATHS.MERCHANT.MENU} />
                }
                path={PATHS.MERCHANT.ROOT}
              />
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
