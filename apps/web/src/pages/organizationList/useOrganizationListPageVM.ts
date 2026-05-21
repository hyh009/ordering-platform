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

  const page = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.max(
    1,
    Math.ceil(pagination.total / pagination.limit),
  );
  const hasPreviousPage = pagination.offset > 0;
  const hasNextPage = page < totalPages;

  const loadPage = useCallback(
    async function loadPage(offset: number, limit = pagination.limit) {
      await commands.loadOrganizations({
        limit,
        offset,
      });
    },
    [commands, pagination.limit],
  );

  useEffect(() => {
    void commands.loadOrganizations({
      limit: pagination.limit,
      offset: 0,
    });
  }, [commands, pagination.limit]);

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
        await commands.loadOrganizations({
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
      modalMode,
      pagination.limit,
      pagination.offset,
    ],
  );

  const previousPage = useCallback(async () => {
    if (!hasPreviousPage) {
      return;
    }

    await loadPage(Math.max(0, pagination.offset - pagination.limit));
  }, [hasPreviousPage, loadPage, pagination.limit, pagination.offset]);

  const nextPage = useCallback(async () => {
    if (!hasNextPage) {
      return;
    }

    await loadPage(pagination.offset + pagination.limit);
  }, [hasNextPage, loadPage, pagination.limit, pagination.offset]);

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
