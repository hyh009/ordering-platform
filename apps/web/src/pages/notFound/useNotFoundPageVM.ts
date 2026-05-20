import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuthVM } from '@/app/global/auth/useAuthVM';
import { useAppTranslation } from '@/app/i18n';

export function useNotFoundPageVM() {
  const auth = useAuthVM();
  const navigate = useNavigate();
  const { tDefault } = useAppTranslation();
  const isAuthenticated = auth.isAuthenticated;
  const isSuperAdmin = auth.user?.isSuperAdmin ?? false;
  const destination = isAuthenticated
    ? isSuperAdmin
      ? '/admin/organizations'
      : '/home'
    : '/admin/login';
  const destinationLabel = isAuthenticated
    ? isSuperAdmin
      ? tDefault('notFound.goToOrganizations', 'Go to organizations')
      : tDefault('notFound.goToHome', 'Go to home')
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
