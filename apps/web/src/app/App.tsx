import { useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { RouteErrorBoundary } from '@/app/AppErrorBoundary';
import { PublicLayout } from '@/app/PublicLayout';
import { RequireAuth } from '@/app/RequireAuth';
import { useAppTranslation } from '@/app/i18n';
import { useAuthVM } from '@/app/viewModel/useAuthVM';
import { LoginPage } from '@/pages/login/LoginPage';
import { NotFoundPage } from '@/pages/notFound/NotFoundPage';
import { RegisterPage } from '@/pages/register/RegisterPage';
import { TodoCreatePage } from '@/pages/todoCreate/TodoCreatePage';
import { TodoDetailPage } from '@/pages/todoDetail/TodoDetailPage';
import { TodoOverviewPage } from '@/pages/todoOverview/TodoOverviewPage';
import { LoadingState } from '@/shared/components/LoadingState';
import { AppLayout } from './AppLayout';

function PublicOnly() {
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
    return <Navigate replace to="/" />;
  }

  return <Outlet />;
}

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
              <Route element={<LoginPage />} path="/login" />
              <Route element={<RegisterPage />} path="/register" />
            </Route>
          </Route>
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route element={<TodoOverviewPage />} index />
            <Route element={<TodoCreatePage />} path="/todos/new" />
            <Route element={<TodoDetailPage />} path="/todos/:todoId" />
            <Route element={<NotFoundPage embedded />} path="*" />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
