import { useCallback, useEffect, useMemo } from 'react';
import { useStore } from 'zustand';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { useCanManageStoreResources } from '@/app/global/activeOrg/useActiveOrgRole';
import { fromStore, toUpdateStoreRequest } from '@/features/components/store/storeForm/storeFormMapper';
import { createStoreSettingsRuntime } from '@/features/merchant/store/settings/runtime';
import { useStoreForm } from '@/features/components/store/storeForm/useStoreForm';
import { tDefault } from '@/app/i18n';
import type { StoreStatus } from '@/models/store';
import { createStoreSettingsPageCommands } from './storeSettingsPage.commands';

export function useStoreSettingsPageVM() {
  const runtime = useMemo(() => createStoreSettingsRuntime(), []);
  const commands = useMemo(
    () => createStoreSettingsPageCommands(runtime.actions),
    [runtime],
  );

  const storeId = useStore(activeStoreStore, (s) => s.storeId);
  const store = useStore(runtime.storeInstance, (s) => s.store);
  const isLoading = useStore(runtime.storeInstance, (s) => s.isLoading);
  const isSaving = useStore(runtime.storeInstance, (s) => s.isSaving);
  const loadError = useStore(runtime.storeInstance, (s) => s.error);

  const canManage = useCanManageStoreResources();
  const form = useStoreForm();
  const { reset: resetForm } = form;

  useEffect(() => {
    if (!storeId) return;
    void commands.loadStore(storeId);
  }, [storeId, commands]);

  useEffect(() => {
    if (store) {
      resetForm(fromStore(store));
    }
  }, [store, resetForm]);

  const submit = useCallback(async () => {
    if (!storeId) return;

    form.setIsSubmitting(true);
    form.setSubmitError(null);

    const result = await commands.updateStore(
      storeId,
      toUpdateStoreRequest(form.values),
    );

    form.setIsSubmitting(false);

    if (result.status === 'saved') {
      feedbackCommands.toast({
        tone: 'success',
        message: tDefault(
          'merchant.storeSettings.savedSuccess',
          'Store settings saved.',
        ),
      });
      return;
    }

    form.setFieldErrors(result.fieldErrors ?? {});
    form.setSubmitError(result.message);
  }, [storeId, form, commands]);

  const toggleStatus = useCallback(async () => {
    if (!storeId || !store) return;

    const newStatus: StoreStatus =
      store.status === 'active' ? 'disabled' : 'active';

    const result = await commands.updateStore(storeId, { status: newStatus });

    if (result.status === 'saved') {
      feedbackCommands.toast({
        tone: 'success',
        message: tDefault(
          'merchant.storeSettings.statusUpdated',
          'Store status updated.',
        ),
      });
      return;
    }

    feedbackCommands.toast({
      tone: 'error',
      message: result.message,
    });
  }, [storeId, store, commands]);

  return {
    canManage,
    form,
    isLoading,
    isSaving,
    loadError,
    store,
    submit,
    toggleStatus,
  };
}
