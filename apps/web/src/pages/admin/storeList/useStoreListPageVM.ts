import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { PATHS } from '@/app/routing/paths';
import { createOrganizationStoreListRuntime } from '@/features/organization/storeList/runtime';
import {
  useOffsetPaginationControls,
  type OffsetPaginationLoadPageInput,
} from '@/shared/hooks/useOffsetPaginationControls';
import { createStoreListPageCommands } from './storeListPage.commands';

function createStoreListPageContext() {
  const { actions, store } = createOrganizationStoreListRuntime();
  const commands = createStoreListPageCommands(actions);

  return { commands, store };
}

export function useStoreListPageVM(organizationId: string) {
  const navigate = useNavigate();
  const [{ commands, store }] = useState(createStoreListPageContext);

  const stores = useStore(store, (state) => state.stores);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);
  const pagination = useStore(store, (state) => state.pagination);

  const loadPage = useCallback(
    async function loadPage({ limit, offset }: OffsetPaginationLoadPageInput) {
      await commands.loadStores(organizationId, { limit, offset });
    },
    [commands, organizationId],
  );

  const { changeLimit, goToPage, page, totalPages } =
    useOffsetPaginationControls({ loadPage, pagination });

  // Initial load (and reload when the organization changes). Page-size and
  // page-number changes go through changeLimit / goToPage, so they are not
  // dependencies here.
  useEffect(() => {
    void loadPage({ limit: pagination.limit, offset: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPage]);

  const goToCreate = useCallback(() => {
    void navigate(PATHS.SUPER_ADMIN.STORE_CREATE_BUILD(organizationId));
  }, [navigate, organizationId]);

  return {
    changeLimit,
    error,
    goToCreate,
    goToPage,
    isLoading,
    page,
    pagination,
    stores,
    totalPages,
  };
}
