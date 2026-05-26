import { useCallback, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { useOrganizationForm } from '@/features/organization/components/organizationForm/useOrganizationForm';
import { createOrganizationListRuntime } from '@/features/organization/list/runtime';
import { toCreateOrganizationRequest } from '@/models/organization';
import {
  useOffsetPaginationControls,
  type OffsetPaginationLoadPageInput,
} from '@/shared/hooks/useOffsetPaginationControls';
import { createOrganizationListPageCommands } from './organizationListPage.commands';

function createOrganizationListPageContext() {
  const { actions, store } = createOrganizationListRuntime();
  const commands = createOrganizationListPageCommands(actions);

  return {
    commands,
    store,
  };
}

export function useOrganizationListPageVM() {
  const [{ commands, store }] = useState(createOrganizationListPageContext);
  const form = useOrganizationForm();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const organizations = useStore(store, (state) => state.organizations);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);
  const pagination = useStore(store, (state) => state.pagination);

  const loadPage = useCallback(
    async function loadPage({ limit, offset }: OffsetPaginationLoadPageInput) {
      await commands.loadOrganizations({
        limit,
        offset,
      });
    },
    [commands],
  );

  const {
    hasNextPage,
    hasPreviousPage,
    nextPage,
    page,
    previousPage,
    totalPages,
  } = useOffsetPaginationControls({
    loadPage,
    pagination,
  });

  useEffect(() => {
    void loadPage({
      limit: pagination.limit,
      offset: 0,
    });
  }, [loadPage, pagination.limit]);

  const openCreateModal = useCallback(() => {
    form.reset();
    setIsCreateModalOpen(true);
  }, [form]);

  const closeCreateModal = useCallback(() => {
    form.reset();
    setIsCreateModalOpen(false);
  }, [form]);

  const submitCreate = useCallback(async () => {
    form.setIsSubmitting(true);
    form.setSubmitError(null);

    const result = await commands.createOrganization(
      toCreateOrganizationRequest(form.values),
    );

    form.setIsSubmitting(false);

    if (result.status === 'saved') {
      closeCreateModal();
      await loadPage({
        limit: pagination.limit,
        offset: 0, // Go back to first page to see the new item
      });
      return;
    }

    form.setFieldErrors(result.fieldErrors ?? {});
    form.setSubmitError(result.message);
  }, [closeCreateModal, commands, form, loadPage, pagination.limit]);

  return {
    error,
    form,
    hasNextPage,
    hasPreviousPage,
    isCreateModalOpen,
    isLoading,
    loadPage,
    nextPage,
    organizations,
    openCreateModal,
    closeCreateModal,
    page,
    pagination,
    previousPage,
    submitCreate,
    totalPages,
  };
}
