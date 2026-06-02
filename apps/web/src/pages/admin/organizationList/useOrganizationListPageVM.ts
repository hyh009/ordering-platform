import { useCallback, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { useFeedbackVM } from '@/app/global/feedback/useFeedbackVM';
import { tDefault } from '@/app/i18n';
import { useOrganizationForm } from '@/features/organization/components/organizationForm/useOrganizationForm';
import { createOrganizationListRuntime } from '@/features/organization/list/runtime';
import type { OrganizationReviewStatusFilter } from '@/features/organization/list/store';
import { toCreateOrganizationRequest } from '@/models/organization';
import type { OrganizationReviewStatus } from '@/models/organization';
import {
  useOffsetPaginationControls,
  type OffsetPaginationLoadPageInput,
} from '@/shared/hooks/useOffsetPaginationControls';
import { createOrganizationListPageCommands } from './organizationListPage.commands';

function createOrganizationListPageContext() {
  const { actions, store } = createOrganizationListRuntime();
  const commands = createOrganizationListPageCommands(actions);

  return {
    actions,
    commands,
    store,
  };
}

export function useOrganizationListPageVM() {
  const [{ actions, commands, store }] = useState(
    createOrganizationListPageContext,
  );
  const form = useOrganizationForm();
  const feedbackVM = useFeedbackVM();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const organizations = useStore(store, (state) => state.organizations);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);
  const pagination = useStore(store, (state) => state.pagination);
  const reviewStatusFilter = useStore(
    store,
    (state) => state.reviewStatusFilter,
  );

  const loadPage = useCallback(
    async function loadPage({
      limit,
      offset,
      reviewStatus,
    }: OffsetPaginationLoadPageInput & {
      reviewStatus?: OrganizationReviewStatus;
    }) {
      await commands.loadOrganizations({
        limit,
        offset,
        reviewStatus,
      });
    },
    [commands],
  );

  const loadCurrentFilterPage = useCallback(
    async (input: OffsetPaginationLoadPageInput) => {
      await loadPage({
        ...input,
        reviewStatus:
          reviewStatusFilter === 'all' ? undefined : reviewStatusFilter,
      });
    },
    [loadPage, reviewStatusFilter],
  );

  const {
    hasNextPage,
    hasPreviousPage,
    nextPage,
    page,
    previousPage,
    totalPages,
  } = useOffsetPaginationControls({
    loadPage: loadCurrentFilterPage,
    pagination,
  });

  useEffect(() => {
    void loadCurrentFilterPage({
      limit: pagination.limit,
      offset: 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewStatusFilter]);

  const setFilter = useCallback(
    (filter: OrganizationReviewStatusFilter) => {
      actions.filterChanged(filter);
    },
    [actions],
  );

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
      await loadCurrentFilterPage({
        limit: pagination.limit,
        offset: 0,
      });
      return;
    }

    form.setFieldErrors(result.fieldErrors ?? {});
    form.setSubmitError(result.message);
  }, [closeCreateModal, commands, form, loadCurrentFilterPage, pagination.limit]);

  const reviewOrganization = useCallback(
    async (
      organizationId: string,
      organizationName: string,
      reviewStatus: 'approved' | 'rejected',
    ) => {
      const isApprove = reviewStatus === 'approved';
      const confirmed = await feedbackVM.confirm({
        title: tDefault(
          isApprove
            ? 'admin.organizations.approveConfirmTitle'
            : 'admin.organizations.rejectConfirmTitle',
          isApprove ? 'Approve organization?' : 'Reject organization?',
        ),
        message: tDefault(
          isApprove
            ? 'admin.organizations.approveConfirmMessage'
            : 'admin.organizations.rejectConfirmMessage',
          isApprove
            ? 'This will mark "{{name}}" as approved.'
            : 'This will mark "{{name}}" as rejected.',
          { name: organizationName },
        ),
      });

      if (!confirmed) return;

      await commands.reviewOrganization(organizationId, reviewStatus);
      await loadCurrentFilterPage({
        limit: pagination.limit,
        offset: pagination.offset,
      });
    },
    [commands, feedbackVM, loadCurrentFilterPage, pagination],
  );

  return {
    error,
    form,
    hasNextPage,
    hasPreviousPage,
    isCreateModalOpen,
    isLoading,
    nextPage,
    organizations,
    openCreateModal,
    closeCreateModal,
    page,
    pagination,
    previousPage,
    reviewOrganization,
    reviewStatusFilter,
    setFilter,
    submitCreate,
    totalPages,
  };
}
