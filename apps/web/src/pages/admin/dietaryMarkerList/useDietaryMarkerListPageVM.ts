import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { tDefault } from '@/app/i18n';
import { createDietaryMarkerListRuntime } from '@/features/metadata/dietaryMarkerList/runtime';
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

  const setFilter = useCallback(
    function setFilter(nextFilter: MetadataActiveFilter) {
      setFilterState(nextFilter);
      void commands.loadDietaryMarkers(nextFilter);
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
            toCreateDietaryMarkerRequest(form.values),
          )
        : await commands.updateDietaryMarker(
            modalMode.dietaryMarker.id,
            toUpdateDietaryMarkerRequest(form.values),
          );

    form.setIsSubmitting(false);

    if (result.status === 'saved') {
      closeModal();
      await commands.loadDietaryMarkers(filter);
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
