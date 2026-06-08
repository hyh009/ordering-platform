import { useCallback, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { useOrganizationForm } from '@/features/components/organization/organizationForm/useOrganizationForm';
import { createOrganizationListRuntime } from '@/features/admin/organization/list/runtime';
import {
  DEFAULT_ORGANIZATION_LIST_SORT,
  type OrganizationReviewStatusFilter,
  type OrganizationStatusFilter,
} from '@/features/admin/organization/list/store';
import { toCreateOrganizationRequest } from '@/models/organization';
import type { OrganizationListSortBy } from '@/models/organization';
import type { DataTableSort } from '@/shared/components/DataTable';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import {
  useOffsetPaginationControls,
  type OffsetPaginationLoadPageInput,
} from '@/shared/hooks/useOffsetPaginationControls';
import { createOrganizationListPageCommands } from './organizationListPage.commands';

const SEARCH_DEBOUNCE_MS = 300;

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const organizations = useStore(store, (state) => state.organizations);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);
  const pagination = useStore(store, (state) => state.pagination);
  const keyword = useStore(store, (state) => state.keyword);
  const reviewStatusFilter = useStore(
    store,
    (state) => state.reviewStatusFilter,
  );
  const statusFilter = useStore(store, (state) => state.statusFilter);
  const sort = useStore(store, (state) => state.sort);

  const debouncedKeyword = useDebouncedValue(keyword, SEARCH_DEBOUNCE_MS);

  const createLoadInput = useCallback(
    ({ limit, offset }: OffsetPaginationLoadPageInput) => {
      const trimmedKeyword = keyword.trim();

      return {
        limit,
        offset,
        keyword: trimmedKeyword || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        reviewStatus:
          reviewStatusFilter === 'all' ? undefined : reviewStatusFilter,
        sortBy: sort.sortBy,
        sortDirection: sort.sortDirection,
      };
    },
    [keyword, statusFilter, reviewStatusFilter, sort],
  );

  const loadCurrentQueryPage = useCallback(
    async ({ limit, offset }: OffsetPaginationLoadPageInput) => {
      await commands.loadOrganizations(createLoadInput({ limit, offset }));
    },
    [commands, createLoadInput],
  );

  const { changeLimit, goToPage, page, totalPages } =
    useOffsetPaginationControls({
      loadPage: loadCurrentQueryPage,
      pagination,
    });

  // Reload from the first page whenever the search, filter, or sort changes.
  // The search term is debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    void loadCurrentQueryPage({ limit: pagination.limit, offset: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedKeyword,
    statusFilter,
    reviewStatusFilter,
    sort.sortBy,
    sort.sortDirection,
  ]);

  const setFilter = useCallback(
    (filter: OrganizationReviewStatusFilter) => {
      actions.filterChanged(filter);
    },
    [actions],
  );

  const setStatusFilter = useCallback(
    (filter: OrganizationStatusFilter) => {
      actions.statusFilterChanged(filter);
    },
    [actions],
  );

  const setKeyword = useCallback(
    (value: string) => {
      actions.keywordChanged(value);
    },
    [actions],
  );

  const setSort = useCallback(
    (next: DataTableSort | null) => {
      actions.sortChanged(
        next
          ? {
              sortBy: next.key as OrganizationListSortBy,
              sortDirection: next.direction,
            }
          : DEFAULT_ORGANIZATION_LIST_SORT,
      );
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
      createLoadInput({
        limit: pagination.limit,
        offset: 0,
      }),
    );

    form.setIsSubmitting(false);

    if (result.status === 'saved') {
      closeCreateModal();
      return;
    }

    form.setFieldErrors(result.fieldErrors ?? {});
    form.setSubmitError(result.message);
  }, [
    closeCreateModal,
    commands,
    createLoadInput,
    form,
    pagination.limit,
  ]);

  return {
    changeLimit,
    error,
    form,
    goToPage,
    isCreateModalOpen,
    isLoading,
    keyword,
    organizations,
    openCreateModal,
    closeCreateModal,
    page,
    pagination,
    reviewStatusFilter,
    setFilter,
    setKeyword,
    setSort,
    setStatusFilter,
    sort,
    statusFilter,
    submitCreate,
    totalPages,
  };
}
