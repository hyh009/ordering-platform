import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { useCanManageStoreResources } from '@/app/global/activeOrg/useActiveOrgRole';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { tDefault } from '@/app/i18n';
import { createCategoryListRuntime } from '@/features/menu/categories/list/runtime';
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
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<string[]>([]);
  const [isReorderSubmitting, setIsReorderSubmitting] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);

  const storeId = useStore(activeStoreStore, (state) => state.storeId);
  const canManage = useCanManageStoreResources();

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

  // Only update filter state; the load effect (keyed on filter via
  // loadCategories) issues the single resulting request. Loading here too would
  // double-fetch.
  const setFilter = useCallback(function setFilter(
    nextFilter: CategoryActiveFilter,
  ) {
    setFilterState(nextFilter);
  }, []);

  const orderedCategories = useMemo<Category[]>(() => {
    if (!isReorderMode) return categories;
    const byId = new Map(categories.map((c) => [c.id, c]));
    return pendingOrder
      .map((id) => byId.get(id))
      .filter((c): c is Category => c !== undefined);
  }, [categories, isReorderMode, pendingOrder]);

  const enterReorderMode = useCallback(() => {
    setPendingOrder(categories.map((c) => c.id));
    setReorderError(null);
    setIsReorderMode(true);
  }, [categories]);

  const cancelReorder = useCallback(() => {
    setIsReorderMode(false);
    setPendingOrder([]);
    setReorderError(null);
  }, []);

  const moveCategory = useCallback((id: string, direction: 'up' | 'down') => {
    setPendingOrder((current) => {
      const index = current.indexOf(id);
      if (index === -1) return current;
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[swapIndex]] = [next[swapIndex]!, next[index]!];
      return next;
    });
  }, []);

  const saveReorder = useCallback(async () => {
    if (!storeId || isReorderSubmitting) return;
    setIsReorderSubmitting(true);
    setReorderError(null);
    const result = await commands.reorderCategories(storeId, pendingOrder);
    setIsReorderSubmitting(false);
    if (result.status === 'reordered') {
      setIsReorderMode(false);
      setPendingOrder([]);
    } else {
      setReorderError(result.message);
    }
  }, [commands, isReorderSubmitting, pendingOrder, storeId]);

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

  const closeModal = useCallback(() => {
    form.reset();
    setModalMode(null);
  }, [form]);

  const submitCategory = useCallback(async () => {
    if (!modalMode || !storeId) {
      return;
    }

    form.setIsSubmitting(true);
    form.setSubmitError(null);

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

    form.setFieldErrors(result.fieldErrors ?? {});
    form.setSubmitError(result.message);
  }, [closeModal, commands, filter, form, modalMode, storeId]);

  const modalTitle = useMemo(() => {
    if (!modalMode) {
      return '';
    }

    return modalMode.type === 'create'
      ? tDefault('merchant.categories.createTitle', 'Create category')
      : tDefault('merchant.categories.editTitle', 'Edit category');
  }, [modalMode]);

  return {
    canManage,
    cancelReorder,
    categories: orderedCategories,
    closeModal,
    enterReorderMode,
    error,
    filter,
    form,
    isCreateMode: modalMode?.type === 'create',
    isLoading,
    isModalOpen: modalMode !== null,
    isReorderMode,
    isReorderSubmitting,
    modalTitle,
    moveCategory,
    openCreateModal,
    openEditModal,
    reorderError,
    saveReorder,
    setFilter,
    submitCategory,
  };
}
