import { loginPageCommands } from './loginPage.commands';
import { useLoginForm } from './useLoginForm';

export function useLoginPageVM(onAuthenticated: () => void) {
  const form = useLoginForm();

  async function submit() {
    form.setIsSubmitting(true);
    form.setSubmitError(null);

    const result = await loginPageCommands.submit(form.values);

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
    setField: form.setField,
    submit,
  };
}
