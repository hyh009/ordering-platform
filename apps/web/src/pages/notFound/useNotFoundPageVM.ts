import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuthVM } from '@/app/global/auth/useAuthVM';
import { useAppTranslation } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';

export function useNotFoundPageVM() {
  const auth = useAuthVM();
  const navigate = useNavigate();
  const { tDefault } = useAppTranslation();
  const isAuthenticated = auth.isAuthenticated;
  const isSuperAdmin = auth.user?.isSuperAdmin ?? false;

  const destination = isAuthenticated
    ? isSuperAdmin
      ? PATHS.SUPER_ADMIN.OVERVIEW
      : PATHS.MERCHANT.MENU
    : PATHS.AUTH.LOGIN;

  const destinationLabel = isAuthenticated
    ? isSuperAdmin
      ? tDefault('notFound.goToOverview', 'Go to overview')
      : tDefault('notFound.goToMyStore', 'Go to my store')
    : tDefault('notFound.signIn', 'Sign in');

  const goBack = useCallback(
    function goBack() {
      navigate(-1);
    },
    [navigate],
  );

  return {
    destination,
    destinationLabel,
    goBack,
    isAuthenticated,
  };
}
