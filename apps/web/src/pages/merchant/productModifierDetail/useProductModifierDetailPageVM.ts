import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useStore } from 'zustand';
import { useCanManageStoreResources } from '@/app/global/activeOrg/useActiveOrgRole';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { PATHS } from '@/app/routing/paths';
import { createProductModifierDetailRuntime } from '@/features/menu/productModifiers/detail/runtime';
import {
  useProductModifierForm,
  valuesFromProductModifier,
  toProductModifierRequest,
} from '@/features/menu/productModifiers/components/productModifierForm/useProductModifierForm';
import { getLocalizedText } from '@/models/metadata';
import { createProductModifierDetailPageCommands } from './productModifierDetailPage.commands';

function createDetailPageContext() {
  const { actions, store } = createProductModifierDetailRuntime();
  const commands = createProductModifierDetailPageCommands(actions);

  return { commands, store };
}

export function useProductModifierDetailPageVM() {
  const [{ commands, store }] = useState(createDetailPageContext);
  const { modifierId } = useParams<{ modifierId: string }>();
  const navigate = useNavigate();

  const storeId = useStore(activeStoreStore, (state) => state.storeId);
  const canManage = useCanManageStoreResources();

  const modifier = useStore(store, (state) => state.modifier);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);

  const [isEditMode, setIsEditMode] = useState(false);
  const form = useProductModifierForm();

  const load = useCallback(async () => {
    if (!storeId || !modifierId) return;

    await commands.loadModifier(storeId, modifierId);
  }, [commands, modifierId, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const enterEditMode = useCallback(() => {
    if (modifier) form.reset(valuesFromProductModifier(modifier));
    setIsEditMode(true);
  }, [form, modifier]);

  const cancelEdit = useCallback(() => {
    setIsEditMode(false);
    if (modifier) form.reset(valuesFromProductModifier(modifier));
  }, [form, modifier]);

  const saveModifier = useCallback(async () => {
    if (!storeId || !modifierId) return;

    form.setIsSubmitting(true);
    form.setSubmitError(null);

    const request = toProductModifierRequest(form.values);
    const result = await commands.updateModifier(storeId, modifierId, request);

    form.setIsSubmitting(false);

    if (result.status === 'saved') {
      setIsEditMode(false);
      return;
    }

    form.setFieldErrors(result.fieldErrors ?? {});
    form.setSubmitError(result.message);
  }, [commands, form, modifierId, storeId]);

  const goBack = useCallback(() => {
    void navigate(PATHS.MERCHANT.MODIFIERS);
  }, [navigate]);

  const pageTitle = useMemo(
    () => (modifier ? getLocalizedText(modifier.name) : ''),
    [modifier],
  );

  return {
    canManage,
    cancelEdit,
    enterEditMode,
    error,
    form,
    goBack,
    isEditMode,
    isLoading,
    modifier,
    pageTitle,
    saveModifier,
  };
}
