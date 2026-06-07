import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { useCanManageStoreResources } from '@/app/global/activeOrg/useActiveOrgRole';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { PATHS } from '@/app/routing/paths';
import { createProductModifierListRuntime } from '@/features/menu/productModifiers/list/runtime';
import type {
  ProductModifier,
  ProductModifierActiveFilter,
} from '@/models/productModifier';
import { createProductModifierListPageCommands } from './productModifierListPage.commands';

function createProductModifierListPageContext() {
  const { actions, store } = createProductModifierListRuntime();
  const commands = createProductModifierListPageCommands(actions);

  return { commands, store };
}

export function useProductModifierListPageVM() {
  const [{ commands, store }] = useState(createProductModifierListPageContext);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ProductModifierActiveFilter>('all');

  const storeId = useStore(activeStoreStore, (state) => state.storeId);
  const canManage = useCanManageStoreResources();

  const productModifiers = useStore(store, (state) => state.productModifiers);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);

  const loadProductModifiers = useCallback(
    async function loadProductModifiers(nextFilter = filter) {
      if (!storeId) return;

      await commands.loadProductModifiers(storeId, nextFilter);
    },
    [commands, filter, storeId],
  );

  useEffect(() => {
    void loadProductModifiers();
  }, [loadProductModifiers]);

  const openModifier = useCallback(
    (modifier: ProductModifier) => {
      void navigate(PATHS.MERCHANT.MODIFIER_DETAIL_BUILD(modifier.id));
    },
    [navigate],
  );

  const openCreate = useCallback(() => {
    void navigate(PATHS.MERCHANT.MODIFIER_CREATE);
  }, [navigate]);

  return {
    canManage,
    error,
    filter,
    isLoading,
    openCreate,
    openModifier,
    productModifiers,
    setFilter,
  };
}
