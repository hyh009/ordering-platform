import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { useCanManageStoreResources } from '@/app/global/activeOrg/useActiveOrgRole';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { tDefault } from '@/app/i18n';
import { createProductModifierListRuntime } from '@/features/menu/productModifierList/runtime';
import type { ProductModifier, ProductModifierActiveFilter } from '@/models/productModifier';
import { createProductModifierListPageCommands } from './productModifierListPage.commands';
import {
  toProductModifierRequest,
  useProductModifierForm,
  valuesFromProductModifier,
} from './useProductModifierForm';

type ProductModifierModalMode =
  | { type: 'create' }
  | { modifier: ProductModifier; type: 'edit' };

function createProductModifierListPageContext() {
  const { actions, store } = createProductModifierListRuntime();
  const commands = createProductModifierListPageCommands(actions);

  return { commands, store };
}

export function useProductModifierListPageVM() {
  const [{ commands, store }] = useState(createProductModifierListPageContext);
  const form = useProductModifierForm();
  const [filter, setFilter] = useState<ProductModifierActiveFilter>('all');
  const [modalMode, setModalMode] = useState<ProductModifierModalMode | null>(null);

  const storeId = useStore(activeStoreStore, (state) => state.storeId);
  const canManage = useCanManageStoreResources();

  const productModifiers = useStore(store, (state) => state.productModifiers);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);

  const loadProductModifiers = useCallback(
    async function loadProductModifiers(nextFilter = filter) {
      if (!storeId) return;

      await commands.loadProductModifiers(storeId, nextFilter);
    },
    [commands, filter, storeId],
  );

  useEffect(() => {
    void loadProductModifiers();
  }, [loadProductModifiers]);

  const openCreateModal = useCallback(() => {
    form.reset();
    setModalMode({ type: 'create' });
  }, [form]);

  const openEditModal = useCallback(
    (modifier: ProductModifier) => {
      form.reset(valuesFromProductModifier(modifier));
      setModalMode({ modifier, type: 'edit' });
    },
    [form],
  );

  const closeModal = useCallback(() => {
    form.reset();
    setModalMode(null);
  }, [form]);

  const submitModifier = useCallback(async () => {
    if (!modalMode || !storeId) return;

    form.setIsSubmitting(true);
    form.setSubmitError(null);

    const request = toProductModifierRequest(form.values);

    const result =
      modalMode.type === 'create'
        ? await commands.createProductModifier(storeId, request)
        : await commands.updateProductModifier(
            storeId,
            modalMode.modifier.id,
            request,
          );

    form.setIsSubmitting(false);

    if (result.status === 'saved') {
      closeModal();
      return;
    }

    form.setFieldErrors(result.fieldErrors ?? {});
    form.setSubmitError(result.message);
  }, [closeModal, commands, form, modalMode, storeId]);

  const modalTitle = useMemo(() => {
    if (!modalMode) return '';

    return modalMode.type === 'create'
      ? tDefault('merchant.productModifiers.createTitle', 'Create modifier')
      : tDefault('merchant.productModifiers.editTitle', 'Edit modifier');
  }, [modalMode]);

  return {
    canManage,
    closeModal,
    error,
    filter,
    form,
    isLoading,
    isModalOpen: modalMode !== null,
    modalTitle,
    openCreateModal,
    openEditModal,
    productModifiers,
    setFilter,
    submitModifier,
  };
}
