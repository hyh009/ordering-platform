import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { tDefault } from '@/app/i18n';
import { createAllergenListRuntime } from '@/features/admin/metadata/allergens/list/runtime';
import type { Allergen, MetadataActiveFilter } from '@/models/metadata';
import { createAllergenListPageCommands } from './allergenListPage.commands';
import {
  toCreateAllergenRequest,
  toUpdateAllergenRequest,
  useAllergenForm,
  valuesFromAllergen,
} from './useAllergenForm';

type AllergenModalMode =
  | {
      type: 'create';
    }
  | {
      allergen: Allergen;
      type: 'edit';
    };

function createAllergenListPageContext() {
  const { actions, store } = createAllergenListRuntime();
  const commands = createAllergenListPageCommands(actions);

  return {
    commands,
    store,
  };
}

export function useAllergenListPageVM() {
  const [{ commands, store }] = useState(createAllergenListPageContext);
  const form = useAllergenForm();
  const [filter, setFilterState] = useState<MetadataActiveFilter>('true');
  const [modalMode, setModalMode] = useState<AllergenModalMode | null>(null);

  const allergens = useStore(store, (state) => state.allergens);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);

  const loadAllergens = useCallback(
    async function loadAllergens(nextFilter = filter) {
      await commands.loadAllergens(nextFilter);
    },
    [commands, filter],
  );

  useEffect(() => {
    void loadAllergens();
  }, [loadAllergens]);

  // Only update filter state; the load effect (keyed on filter via
  // loadAllergens) issues the single resulting request. Loading here too would
  // double-fetch the same data on every filter change.
  const setFilter = useCallback(function setFilter(
    nextFilter: MetadataActiveFilter,
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
    (allergen: Allergen) => {
      form.reset(valuesFromAllergen(allergen));
      setModalMode({
        allergen,
        type: 'edit',
      });
    },
    [form],
  );

  const closeModal = useCallback(() => {
    form.reset();
    setModalMode(null);
  }, [form]);

  const submitAllergen = useCallback(async () => {
    if (!modalMode) {
      return;
    }

    form.setIsSubmitting(true);
    form.setSubmitError(null);

    const result =
      modalMode.type === 'create'
        ? await commands.createAllergen(
            filter,
            toCreateAllergenRequest(form.values),
          )
        : await commands.updateAllergen(
            filter,
            modalMode.allergen.id,
            toUpdateAllergenRequest(form.values),
          );

    form.setIsSubmitting(false);

    if (result.status === 'saved') {
      closeModal();
      return;
    }

    form.setFieldErrors(result.fieldErrors ?? {});
    form.setSubmitError(result.message);
  }, [closeModal, commands, filter, form, modalMode]);

  const modalTitle = useMemo(() => {
    if (!modalMode) {
      return '';
    }

    return modalMode.type === 'create'
      ? tDefault('admin.allergens.createTitle', 'Create allergen')
      : tDefault('admin.allergens.editTitle', 'Edit allergen');
  }, [modalMode]);

  return {
    allergens,
    closeModal,
    error,
    filter,
    form,
    isCreateMode: modalMode?.type === 'create',
    isLoading,
    isModalOpen: modalMode !== null,
    loadAllergens,
    modalTitle,
    openCreateModal,
    openEditModal,
    setFilter,
    submitAllergen,
  };
}
