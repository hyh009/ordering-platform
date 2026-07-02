import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { handleMerchantFailure } from '../merchantFailureFeedback';
import { useCanManageStoreResources } from '@/app/global/activeOrg/useActiveOrgRole';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { useActiveStoreLocale } from '@/app/global/activeStore/useActiveStoreLocale';
import { tDefault } from '@/app/i18n';
import { createCategoryListRuntime } from '@/features/merchant/menu/categories/list/runtime';
import { useReorder } from '@/shared/hooks/useReorder';
import type { Category, CategoryActiveFilter } from '@/models/category';
import { createCategoryListPageCommands } from './categoryListPage.commands';
import {
  toCategoryRequest,
  useCategoryForm,
  valuesFromCategory,
} from './useCategoryForm';

type CategoryModalMode =
  | {
      type: 'create';
    }
  | {
      category: Category;
      type: 'edit';
    }
  | {
      category: Category;
      type: 'view';
    };

function createCategoryListPageContext() {
  const { actions, store } = createCategoryListRuntime();
  const commands = createCategoryListPageCommands(actions);

  return {
    commands,
    store,
  };
}

export function useCategoryListPageVM() {
  const [{ commands, store }] = useState(createCategoryListPageContext);
  const form = useCategoryForm();
  const [filter, setFilterState] = useState<CategoryActiveFilter>('all');
  const [modalMode, setModalMode] = useState<CategoryModalMode | null>(null);

  const storeId = useStore(activeStoreStore, (state) => state.storeId);
  const canManage = useCanManageStoreResources();
  const locale = useActiveStoreLocale();

  const categories = useStore(store, (state) => state.categories);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);

  const loadCategories = useCallback(
    async function loadCategories(nextFilter = filter) {
      if (!storeId) {
        return;
      }

      await commands.loadCategories(storeId, nextFilter);
    },
    [commands, filter, storeId],
  );

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const retry = useCallback(() => {
    void loadCategories();
  }, [loadCategories]);

  // Only update filter state; the load effect (keyed on filter via
  // loadCategories) issues the single resulting request. Loading here too would
  // double-fetch.
  const setFilter = useCallback(function setFilter(
    nextFilter: CategoryActiveFilter,
  ) {
    setFilterState(nextFilter);
  }, []);

  const reorder = useReorder(categories, (orderedIds) =>
    storeId
      ? commands.reorderCategories(storeId, orderedIds)
      : Promise.resolve({ status: 'failed' as const, message: '' }),
  );

  const openCreateModal = useCallback(() => {
    form.reset();
    setModalMode({
      type: 'create',
    });
  }, [form]);

  const openEditModal = useCallback(
    (category: Category) => {
      form.reset(valuesFromCategory(category));
      setModalMode({
        category,
        type: 'edit',
      });
    },
    [form],
  );

  const openViewModal = useCallback((category: Category) => {
    setModalMode({
      category,
      type: 'view',
    });
  }, []);

  const closeModal = useCallback(() => {
    form.reset();
    setModalMode(null);
  }, [form]);

  const submitCategory = useCallback(async () => {
    if (!modalMode || !storeId) {
      return;
    }

    form.setIsSubmitting(true);
    form.resetErrors();

    const result =
      modalMode.type === 'create'
        ? await commands.createCategory(
            storeId,
            filter,
            toCategoryRequest(form.values),
          )
        : await commands.updateCategory(
            storeId,
            filter,
            modalMode.category.id,
            toCategoryRequest(form.values),
          );

    form.setIsSubmitting(false);

    if (result.status === 'saved') {
      closeModal();
      return;
    }

    handleMerchantFailure(result, {
      form: {
        setSubmitError: form.setSubmitError,
        setFieldErrors: form.setFieldErrors,
      },
    });
  }, [closeModal, commands, filter, form, modalMode, storeId]);

  const modalTitle = useMemo(() => {
    if (!modalMode) {
      return '';
    }

    if (modalMode.type === 'create') {
      return tDefault('merchant.categories.createTitle', 'Create category');
    }

    return modalMode.type === 'view'
      ? tDefault('merchant.categories.viewTitle', 'Category')
      : tDefault('merchant.categories.editTitle', 'Edit category');
  }, [modalMode]);

  return {
    canManage,
    cancelReorder: reorder.cancel,
    categories: reorder.orderedItems,
    closeModal,
    enterReorderMode: reorder.enter,
    error,
    filter,
    form,
    isLoading,
    isModalOpen: modalMode !== null,
    isReorderMode: reorder.isReorderMode,
    isReorderSubmitting: reorder.isSubmitting,
    isViewMode: modalMode?.type === 'view',
    locale,
    modalTitle,
    moveCategory: reorder.move,
    openCreateModal,
    openEditModal,
    openViewModal,
    reorderError: reorder.error,
    retry,
    viewedCategory: modalMode?.type === 'view' ? modalMode.category : null,
    saveReorder: reorder.save,
    setFilter,
    submitCategory,
  };
}
