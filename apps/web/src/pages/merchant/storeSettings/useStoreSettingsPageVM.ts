import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { useCanManageStoreResources } from '@/app/global/activeOrg/useActiveOrgRole';
import deepEqual from 'fast-deep-equal';
import { toUpdateStoreRequest, fromStore } from '@/features/components/store/storeForm/storeFormMapper';
import { createStoreDetailRuntime } from '@/features/merchant/store/detail/runtime';
import { useStoreForm } from '@/features/components/store/storeForm/useStoreForm';
import { tDefault } from '@/app/i18n';
import {
  getImageFileValidationMessage,
  validateImageFile,
  type StoreImageKind,
} from '@/models/asset';
import type { UpdateStoreResult } from '@/features/merchant/store/mutations/commands';
import type { StoreStatus } from '@/models/store';
import { createStoreSettingsPageCommands } from './storeSettingsPage.commands';

export function useStoreSettingsPageVM() {
  const runtime = useMemo(() => createStoreDetailRuntime(), []);
  const commands = useMemo(
    () => createStoreSettingsPageCommands(runtime.actions),
    [runtime],
  );

  const storeId = useStore(activeStoreStore, (s) => s.storeId);
  const store = useStore(runtime.store, (s) => s.store);
  const isLoading = useStore(runtime.store, (s) => s.isLoading);
  const loadError = useStore(runtime.store, (s) => s.error);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  // Which branding image is mid-request, so the view can disable just that
  // control. null when no upload/removal is in flight.
  const [imageUpdatingKind, setImageUpdatingKind] =
    useState<StoreImageKind | null>(null);

  const canManage = useCanManageStoreResources();
  const form = useStoreForm();
  const { reset: resetForm } = form;

  // savedValues: snapshot of form values at last successful load or save.
  // Derived from store so it stays in sync without a separate setState call.
  // Used as the diff baseline in submit and will drive isDirty below.
  const savedValues = useMemo(
    () => (store ? fromStore(store) : null),
    [store],
  );

  // isDirty: true when form.values diverges from savedValues.
  // Also intended for blocking navigation via useBlocker (in-app) +
  // beforeunload (tab close) — not wired up yet.
  const isDirty = useMemo(
    () => savedValues !== null && !deepEqual(savedValues, form.values),
    [savedValues, form.values],
  );

  useEffect(() => {
    if (!storeId) return;
    void commands.loadStore(storeId);
  }, [storeId, commands]);

  useEffect(() => {
    if (savedValues) resetForm(savedValues);
  }, [savedValues, resetForm]);

  const submit = useCallback(async () => {
    if (!storeId || !savedValues) return;

    const patch = toUpdateStoreRequest(savedValues, form.values);
    if (Object.keys(patch).length === 0) return;

    form.setIsSubmitting(true);
    form.setSubmitError(null);

    const result = await commands.updateStore(storeId, patch);

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
  }, [storeId, savedValues, form, commands]);

  // Shared wrapper for branding-image mutations: flags the in-flight control,
  // runs the command, then toasts the outcome.
  const runImageUpdate = useCallback(
    async (
      kind: StoreImageKind,
      successMessage: string,
      run: () => Promise<UpdateStoreResult>,
    ) => {
      setImageUpdatingKind(kind);
      const result = await run();
      setImageUpdatingKind(null);

      feedbackCommands.toast(
        result.status === 'saved'
          ? { tone: 'success', message: successMessage }
          : { tone: 'error', message: result.message },
      );
    },
    [],
  );

  const setImage = useCallback(
    async (kind: StoreImageKind, file: File) => {
      if (!storeId) return;

      const validation = validateImageFile(file);
      if (!validation.ok) {
        feedbackCommands.toast({
          tone: 'error',
          message: getImageFileValidationMessage(validation.reason, tDefault),
        });
        return;
      }

      await runImageUpdate(
        kind,
        tDefault('merchant.storeSettings.branding.imageUpdated', 'Image updated.'),
        () => commands.setStoreImage(storeId, kind, file),
      );
    },
    [storeId, commands, runImageUpdate],
  );

  const removeImage = useCallback(
    async (kind: StoreImageKind) => {
      if (!storeId) return;

      await runImageUpdate(
        kind,
        tDefault('merchant.storeSettings.branding.imageRemoved', 'Image removed.'),
        () => commands.removeStoreImage(storeId, kind),
      );
    },
    [storeId, commands, runImageUpdate],
  );

  const toggleStatus = useCallback(async () => {
    if (!storeId || !store) return;

    const newStatus: StoreStatus =
      store.status === 'active' ? 'disabled' : 'active';

    setIsStatusUpdating(true);
    const result = await commands.updateStore(storeId, { status: newStatus });
    setIsStatusUpdating(false);

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
    imageUpdatingKind,
    isDirty,
    isLoading,
    isStatusUpdating,
    loadError,
    removeImage,
    setImage,
    store,
    submit,
    toggleStatus,
  };
}
