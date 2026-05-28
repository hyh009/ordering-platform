import { useLocation, useNavigate } from 'react-router';
import { loginSchema } from '@repo/shared';
import { tDefault } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import type { AuthUserDto } from '@/models/auth.types';
import { loginPageCommands } from './loginPage.commands';
import { type LoginFieldErrors, useLoginForm } from './useLoginForm';

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

function getLoginFieldErrorKey(
  path: PropertyKey[],
): keyof LoginFieldErrors | null {
  const [field] = path.map(String);

  if (field === 'email' || field === 'password') {
    return field;
  }

  return null;
}

function loginValidationErrors() {
  return {
    email: tDefault('auth.validation.emailInvalid', 'Enter a valid email.'),
    password: tDefault(
      'auth.validation.passwordRequired',
      'Password is required.',
    ),
  };
}

function mapLoginValidationIssuesToFieldErrors(
  issues: Array<{ path: PropertyKey[] }>,
): LoginFieldErrors {
  const messages = loginValidationErrors();
  const fieldErrors: LoginFieldErrors = {};

  for (const issue of issues) {
    const field = getLoginFieldErrorKey(issue.path);

    if (!field || fieldErrors[field]) {
      continue;
    }

    fieldErrors[field] = messages[field];
  }

  return fieldErrors;
}

export function useLoginPageVM() {
  const form = useLoginForm();
  const location = useLocation();
  const navigate = useNavigate();

  async function submit() {
    const validation = loginSchema.safeParse(form.values);

    if (!validation.success) {
      form.setFieldErrors(
        mapLoginValidationIssuesToFieldErrors(validation.error.issues),
      );
      form.setSubmitError(
        tDefault(
          'auth.validation.submitInvalid',
          'Check the highlighted fields and try again.',
        ),
      );
      return;
    }

    form.setIsSubmitting(true);
    form.setSubmitError(null);

    const result = await loginPageCommands.submit(validation.data);

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
