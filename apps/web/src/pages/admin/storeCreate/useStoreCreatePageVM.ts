import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { PATHS } from '@/app/routing/paths';
import { toCreateStoreRequest } from '@/features/components/store/storeForm/storeFormMapper';
import { useStoreForm } from '@/features/components/store/storeForm/useStoreForm';
import { createStoreCreatePageCommands } from './storeCreatePage.commands';

const storeCreatePageCommands = createStoreCreatePageCommands();

export function useStoreCreatePageVM(
  organizationId: string,
  organizationName?: string,
) {
  const navigate = useNavigate();
  const form = useStoreForm();

  const cancel = useCallback(() => {
    void navigate(PATHS.SUPER_ADMIN.ORGANIZATION_DETAIL_BUILD(organizationId));
  }, [navigate, organizationId]);

  const submit = useCallback(async () => {
    form.setIsSubmitting(true);
    form.setSubmitError(null);

    const result = await storeCreatePageCommands.createStore(
      organizationId,
      toCreateStoreRequest(form.values),
    );

    form.setIsSubmitting(false);

    if (result.status === 'created') {
      form.reset();
      void navigate(
        PATHS.SUPER_ADMIN.ORGANIZATION_DETAIL_BUILD(organizationId),
      );
      return;
    }

    form.setFieldErrors(result.fieldErrors ?? {});
    form.setSubmitError(result.message);
  }, [form, navigate, organizationId]);

  return {
    cancel,
    form,
    organizationName,
    submit,
  };
}
