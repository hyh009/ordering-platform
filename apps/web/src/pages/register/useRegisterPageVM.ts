import { registerSchema } from '@repo/shared';
import { tDefault } from '@/app/i18n';
import { registerPageCommands } from './registerPage.commands';
import { useRegisterForm } from './useRegisterForm';
import type {
  RegisterFieldErrors,
  RegisterFormValues,
} from './useRegisterForm';
import type { RegisterRequest } from '@/models/auth.types';

type RegisterFormValidationResult =
  | {
      success: true;
      request: RegisterRequest;
    }
  | {
      success: false;
      fieldErrors: RegisterFieldErrors;
    };

function validateRegisterForm(
  form: RegisterFormValues,
): RegisterFormValidationResult {
  const errors: RegisterFieldErrors = {};
  const { confirmPassword, ...request } = form;
  const result = registerSchema.safeParse(request);

  if (!result.success) {
    for (const issue of result.error.issues) {
      const fieldName = issue.path[0];

      if (
        fieldName === 'email' ||
        fieldName === 'username' ||
        fieldName === 'password'
      ) {
        errors[fieldName] ??= issue.message;
      }
    }
  }

  if (!confirmPassword) {
    errors.confirmPassword = tDefault(
      'auth.validation.confirmPasswordRequired',
      'Confirm password is required.',
    );
  } else if (form.password !== confirmPassword) {
    errors.confirmPassword = tDefault(
      'auth.validation.passwordsDoNotMatch',
      'Passwords do not match.',
    );
  }

  if (!result.success || Object.keys(errors).length > 0) {
    return {
      fieldErrors: errors,
      success: false,
    };
  }

  return {
    request: result.data,
    success: true,
  };
}

export function useRegisterPageVM(onAuthenticated: () => void) {
  const form = useRegisterForm();

  async function submit() {
    form.setIsSubmitting(true);
    form.setSubmitError(null);

    const validation = validateRegisterForm(form.values);

    if (!validation.success) {
      form.setIsSubmitting(false);
      form.setFieldErrors(validation.fieldErrors);
      form.setSubmitError(
        tDefault(
          'auth.validation.submitInvalid',
          'Check the highlighted fields and try again.',
        ),
      );
      return;
    }

    const result = await registerPageCommands.submit(validation.request);

    form.setIsSubmitting(false);

    if (result.status === 'authenticated') {
      form.reset();
      onAuthenticated();
      return;
    }

    form.setFieldErrors(result.fieldErrors ?? {});
    form.setSubmitError(result.message);
  }

  return {
    form,
    passwordRuleMessage: tDefault(
      'auth.register.passwordDescription',
      'Use at least 8 characters with uppercase, lowercase, and a number.',
    ),
    setField: form.setField,
    submit,
  };
}
