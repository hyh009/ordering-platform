import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { PATHS } from '@/app/routing/paths';
import { useStoreForm } from '@/features/store/components/storeForm/useStoreForm';
import { toCreateStoreRequest } from '@/features/store/components/storeForm/storeFormMapper';
import { organizationService } from '@/services/organization.service';
import { mapAdminApiError } from '@/services/utils/adminApiError';

export function useStoreCreatePageVM(organizationId: string, organizationName?: string) {
  const navigate = useNavigate();
  const form = useStoreForm();

  const cancel = useCallback(() => {
    void navigate(
      PATHS.SUPER_ADMIN.ORGANIZATION_DETAIL_BUILD(organizationId),
    );
  }, [navigate, organizationId]);

  const submit = useCallback(async () => {
    const zhTW = form.values.displayName['zh-TW']?.trim();
    if (!zhTW) {
      form.setFieldErrors({ displayName: 'Store name (繁體中文) is required.' });
      return;
    }

    if (form.values.supportedLocales.length === 0) {
      form.setFieldErrors({ supportedLocales: 'At least one locale is required.' });
      return;
    }

    form.setIsSubmitting(true);
    form.setSubmitError(null);

    try {
      await organizationService.createAdminStore(
        organizationId,
        toCreateStoreRequest(form.values),
      );

      form.reset();
      void navigate(
        PATHS.SUPER_ADMIN.ORGANIZATION_DETAIL_BUILD(organizationId),
      );
    } catch (error) {
      const failure = mapAdminApiError(error);
      form.setIsSubmitting(false);
      form.setSubmitError(failure.message);
    }
  }, [form, navigate, organizationId]);

  return {
    cancel,
    form,
    organizationName,
    submit,
  };
}
