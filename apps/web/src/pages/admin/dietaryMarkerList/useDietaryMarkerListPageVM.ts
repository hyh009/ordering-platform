import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { tDefault } from '@/app/i18n';
import { createDietaryMarkerListRuntime } from '@/features/admin/metadata/dietaryMarkers/list/runtime';
import type { DietaryMarker, MetadataActiveFilter } from '@/models/metadata';
import { createDietaryMarkerListPageCommands } from './dietaryMarkerListPage.commands';
import {
  toCreateDietaryMarkerRequest,
  toUpdateDietaryMarkerRequest,
  useDietaryMarkerForm,
  valuesFromDietaryMarker,
} from './useDietaryMarkerForm';

type DietaryMarkerModalMode =
  | {
      type: 'create';
    }
  | {
      dietaryMarker: DietaryMarker;
      type: 'edit';
    };

function createDietaryMarkerListPageContext() {
  const { actions, store } = createDietaryMarkerListRuntime();
  const commands = createDietaryMarkerListPageCommands(actions);

  return {
    commands,
    store,
  };
}

export function useDietaryMarkerListPageVM() {
  const [{ commands, store }] = useState(createDietaryMarkerListPageContext);
  const form = useDietaryMarkerForm();
  const [filter, setFilterState] = useState<MetadataActiveFilter>('true');
  const [modalMode, setModalMode] = useState<DietaryMarkerModalMode | null>(
    null,
  );

  const dietaryMarkers = useStore(store, (state) => state.dietaryMarkers);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);

  const loadDietaryMarkers = useCallback(
    async function loadDietaryMarkers(nextFilter = filter) {
      await commands.loadDietaryMarkers(nextFilter);
    },
    [commands, filter],
  );

  useEffect(() => {
    void loadDietaryMarkers();
  }, [loadDietaryMarkers]);

  // Only update filter state; the load effect (keyed on filter via
  // loadDietaryMarkers) issues the single resulting request. Loading here too
  // would double-fetch the same data on every filter change.
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
    (dietaryMarker: DietaryMarker) => {
      form.reset(valuesFromDietaryMarker(dietaryMarker));
      setModalMode({
        dietaryMarker,
        type: 'edit',
      });
    },
    [form],
  );

  const closeModal = useCallback(() => {
    form.reset();
    setModalMode(null);
  }, [form]);

  const submitDietaryMarker = useCallback(async () => {
    if (!modalMode) {
      return;
    }

    form.setIsSubmitting(true);
    form.setSubmitError(null);

    const result =
      modalMode.type === 'create'
        ? await commands.createDietaryMarker(
            filter,
            toCreateDietaryMarkerRequest(form.values),
          )
        : await commands.updateDietaryMarker(
            filter,
            modalMode.dietaryMarker.id,
            toUpdateDietaryMarkerRequest(form.values),
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
      ? tDefault('admin.dietaryMarkers.createTitle', 'Create dietary marker')
      : tDefault('admin.dietaryMarkers.editTitle', 'Edit dietary marker');
  }, [modalMode]);

  return {
    closeModal,
    dietaryMarkers,
    error,
    filter,
    form,
    isCreateMode: modalMode?.type === 'create',
    isLoading,
    isModalOpen: modalMode !== null,
    loadDietaryMarkers,
    modalTitle,
    openCreateModal,
    openEditModal,
    setFilter,
    submitDietaryMarker,
  };
}
