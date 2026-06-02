import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { PATHS } from '@/app/routing/paths';
import { validateStoreForm } from '@/features/store/components/storeForm/storeFormErrors';
import { useStoreForm } from '@/features/store/components/storeForm/useStoreForm';
import { createStoreCreatePageCommands } from './storeCreatePage.commands';

export function useStoreCreatePageVM(organizationId: string, organizationName?: string) {
  const navigate = useNavigate();
  const form = useStoreForm();
  const [commands] = useState(createStoreCreatePageCommands);

  const cancel = useCallback(() => {
    void navigate(PATHS.SUPER_ADMIN.ORGANIZATION_DETAIL_BUILD(organizationId));
  }, [navigate, organizationId]);

  const submit = useCallback(async () => {
    const validation = validateStoreForm(form.values);

    if (!validation.success) {
      form.setFieldErrors(validation.fieldErrors);
      form.setSubmitError(validation.submitError);
      return;
    }

    form.setIsSubmitting(true);
    form.setSubmitError(null);

    const result = await commands.createStore(organizationId, validation.data);

    if (result.status === 'created') {
      form.reset();
      void navigate(PATHS.SUPER_ADMIN.ORGANIZATION_DETAIL_BUILD(organizationId));
      return;
    }

    form.setIsSubmitting(false);
    form.setSubmitError(result.message);
  }, [commands, form, navigate, organizationId]);

  return {
    cancel,
    form,
    organizationName,
    submit,
  };
}
