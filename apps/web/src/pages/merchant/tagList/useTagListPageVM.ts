import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { useCanManageStoreResources } from '@/app/global/activeOrg/useActiveOrgRole';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { tDefault } from '@/app/i18n';
import { createTagListRuntime } from '@/features/menu/tags/list/runtime';
import type { Tag, TagActiveFilter } from '@/models/tag';
import { createTagListPageCommands } from './tagListPage.commands';
import { toTagRequest, useTagForm, valuesFromTag } from './useTagForm';

type TagModalMode =
  | {
      type: 'create';
    }
  | {
      tag: Tag;
      type: 'edit';
    };

function createTagListPageContext() {
  const { actions, store } = createTagListRuntime();
  const commands = createTagListPageCommands(actions);

  return {
    commands,
    store,
  };
}

export function useTagListPageVM() {
  const [{ commands, store }] = useState(createTagListPageContext);
  const form = useTagForm();
  const [filter, setFilterState] = useState<TagActiveFilter>('all');
  const [modalMode, setModalMode] = useState<TagModalMode | null>(null);

  const storeId = useStore(activeStoreStore, (state) => state.storeId);
  const canManage = useCanManageStoreResources();

  const tags = useStore(store, (state) => state.tags);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);

  const loadTags = useCallback(
    async function loadTags(nextFilter = filter) {
      if (!storeId) {
        return;
      }

      await commands.loadTags(storeId, nextFilter);
    },
    [commands, filter, storeId],
  );

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  // Only update filter state; the load effect (keyed on filter via loadTags)
  // issues the single resulting request. Loading here too would double-fetch.
  const setFilter = useCallback(function setFilter(
    nextFilter: TagActiveFilter,
  ) {
    setFilterState(nextFilter);
  }, []);

  const openCreateModal = useCallback(() => {
    form.reset();
    setModalMode({
      type: 'create',
    });
  }, [form]);

  const openEditModal = useCallback(
    (tag: Tag) => {
      form.reset(valuesFromTag(tag));
      setModalMode({
        tag,
        type: 'edit',
      });
    },
    [form],
  );

  const closeModal = useCallback(() => {
    form.reset();
    setModalMode(null);
  }, [form]);

  const submitTag = useCallback(async () => {
    if (!modalMode || !storeId) {
      return;
    }

    form.setIsSubmitting(true);
    form.setSubmitError(null);

    const result =
      modalMode.type === 'create'
        ? await commands.createTag(storeId, filter, toTagRequest(form.values))
        : await commands.updateTag(
            storeId,
            filter,
            modalMode.tag.id,
            toTagRequest(form.values),
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
      ? tDefault('merchant.tags.createTitle', 'Create tag')
      : tDefault('merchant.tags.editTitle', 'Edit tag');
  }, [modalMode]);

  return {
    canManage,
    closeModal,
    error,
    filter,
    form,
    isCreateMode: modalMode?.type === 'create',
    isLoading,
    isModalOpen: modalMode !== null,
    modalTitle,
    openCreateModal,
    openEditModal,
    setFilter,
    submitTag,
    tags,
  };
}
