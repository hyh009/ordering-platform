import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { tDefault } from '@/app/i18n';
import { createAllergenListActions } from '@/features/metadata/actions/allergenList.actions';
import { createAllergenListStore } from '@/features/metadata/store/allergenList.store';
import type { Allergen, MetadataActiveFilter } from '@/models/metadata.types';
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
  const store = createAllergenListStore();
  const actions = createAllergenListActions(store);
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

  const setFilter = useCallback(
    function setFilter(nextFilter: MetadataActiveFilter) {
      setFilterState(nextFilter);
      void commands.loadAllergens(nextFilter);
    },
    [commands],
  );

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
        ? await commands.createAllergen(toCreateAllergenRequest(form.values))
        : await commands.updateAllergen(
            modalMode.allergen.id,
            toUpdateAllergenRequest(form.values),
          );

    form.setIsSubmitting(false);

    if (result.status === 'saved') {
      closeModal();
      await commands.loadAllergens(filter);
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
