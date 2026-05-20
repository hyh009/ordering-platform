import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { RouteErrorBoundary } from '@/app/error/AppErrorBoundary';
import { useAuthVM } from '@/app/global/auth/useAuthVM';
import { PublicLayout } from '@/app/layout/PublicLayout';
import { AppLayout } from '@/app/layout/AppLayout';
import { PublicOnly } from '@/app/routing/PublicOnly';
import { RequireAuth } from '@/app/routing/RequireAuth';
import { RequireSuperAdmin } from '@/app/routing/RequireSuperAdmin';
import { AllergenListPage } from '@/pages/allergenList/AllergenListPage';
import { DietaryMarkerListPage } from '@/pages/dietaryMarkerList/DietaryMarkerListPage';
import { LoginPage } from '@/pages/login/LoginPage';
import { NotFoundPage } from '@/pages/notFound/NotFoundPage';
import { OrganizationDetailPage } from '@/pages/organizationDetail/OrganizationDetailPage';
import { OrganizationListPage } from '@/pages/organizationList/OrganizationListPage';
import { UserHomePage } from '@/pages/userHome/UserHomePage';

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
              <Route element={<LoginPage />} path="/admin/login" />
            </Route>
          </Route>
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route element={<Navigate replace to="/home" />} index />
            <Route element={<UserHomePage />} path="/home" />
            <Route element={<RequireSuperAdmin />}>
              <Route
                element={<Navigate replace to="/admin/organizations" />}
                path="/admin"
              />
              <Route
                element={<OrganizationListPage />}
                path="/admin/organizations"
              />
              <Route
                element={<OrganizationDetailPage />}
                path="/admin/organizations/:organizationId"
              />
              <Route element={<AllergenListPage />} path="/admin/allergens" />
              <Route
                element={<DietaryMarkerListPage />}
                path="/admin/dietary-markers"
              />
            </Route>
            <Route element={<NotFoundPage embedded />} path="*" />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
