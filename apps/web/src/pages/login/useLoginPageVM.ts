import { useLocation, useNavigate } from 'react-router';
import { PATHS } from '@/app/routing/paths';
import type { AuthUserDto } from '@/models/auth';
import { loginPageCommands } from './loginPage.commands';
import { useLoginForm } from './useLoginForm';

type RouteState = {
  from?: {
    pathname?: string;
  };
};

function getRedirectPath(state: unknown, user: AuthUserDto) {
  const routeState = state as RouteState | null;

  return (
    routeState?.from?.pathname ??
    (user.isSuperAdmin ? PATHS.SUPER_ADMIN.ORGANIZATIONS : PATHS.MERCHANT.MENU)
  );
}

export function useLoginPageVM() {
  const form = useLoginForm();
  const location = useLocation();
  const navigate = useNavigate();

  async function submit() {
    form.setIsSubmitting(true);
    form.setSubmitError(null);

    const result = await loginPageCommands.submit(form.values);

    form.setIsSubmitting(false);

    if (result.status === 'authenticated') {
      form.reset();
      navigate(getRedirectPath(location.state, result.user), {
        replace: true,
      });
      return;
    }

    form.setFieldErrors(result.fieldErrors ?? {});
    form.setSubmitError(result.message);
  }

  return {
    form,
    setField: form.setField,
    submit,
  };
}
