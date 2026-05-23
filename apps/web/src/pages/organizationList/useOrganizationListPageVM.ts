import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { tDefault } from '@/app/i18n';
import { createOrganizationListRuntime } from '@/features/organization/list/runtime';
import {
  toCreateOrganizationRequest,
  toUpdateOrganizationRequest,
  useOrganizationForm,
  valuesFromOrganization,
} from '@/features/organization/components/organizationForm/useOrganizationForm';
import type { Organization } from '@/models/organization.types';
import {
  useOffsetPaginationControls,
  type OffsetPaginationLoadPageInput,
} from '@/shared/hooks/useOffsetPaginationControls';
import { createOrganizationListPageCommands } from './organizationListPage.commands';

type OrganizationModalMode =
  | {
      type: 'create';
    }
  | {
      organization: Organization;
      type: 'edit';
    };

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
  const [modalMode, setModalMode] = useState<OrganizationModalMode | null>(
    null,
  );

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

  const openCreateModal = useCallback(
    function openCreateModal() {
      form.reset();
      setModalMode({
        type: 'create',
      });
    },
    [form],
  );

  const openEditModal = useCallback(
    function openEditModal(organization: Organization) {
      form.reset(valuesFromOrganization(organization));
      setModalMode({
        organization,
        type: 'edit',
      });
    },
    [form],
  );

  const closeModal = useCallback(
    function closeModal() {
      form.reset();
      setModalMode(null);
    },
    [form],
  );

  const submitOrganization = useCallback(
    async function submitOrganization() {
      if (!modalMode) {
        return;
      }

      form.setIsSubmitting(true);
      form.setSubmitError(null);

      const result =
        modalMode.type === 'create'
          ? await commands.createOrganization(
              toCreateOrganizationRequest(form.values),
            )
          : await commands.updateOrganization(
              modalMode.organization.id,
              toUpdateOrganizationRequest(form.values),
            );

      form.setIsSubmitting(false);

      if (result.status === 'saved') {
        closeModal();
        await loadPage({
          limit: pagination.limit,
          offset: pagination.offset,
        });
        return;
      }

      form.setFieldErrors(result.fieldErrors ?? {});
      form.setSubmitError(result.message);
    },
    [
      closeModal,
      commands,
      form,
      loadPage,
      modalMode,
      pagination.limit,
      pagination.offset,
    ],
  );

  const modalTitle = useMemo(() => {
    if (!modalMode) {
      return '';
    }

    return modalMode.type === 'create'
      ? tDefault('admin.organizations.createTitle', 'Create organization')
      : tDefault('admin.organizations.editTitle', 'Edit organization');
  }, [modalMode]);

  return {
    closeModal,
    error,
    form,
    hasNextPage,
    hasPreviousPage,
    isLoading,
    isModalOpen: modalMode !== null,
    isCreateMode: modalMode?.type === 'create',
    loadPage,
    modalTitle,
    nextPage,
    organizations,
    page,
    pagination,
    previousPage,
    submitOrganization,
    totalPages,
    openCreateModal,
    openEditModal,
  };
}
