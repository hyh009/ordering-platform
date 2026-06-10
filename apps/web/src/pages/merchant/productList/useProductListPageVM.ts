import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { useCanManageStoreResources } from '@/app/global/activeOrg/useActiveOrgRole';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { PATHS } from '@/app/routing/paths';
import { createProductListRuntime } from '@/features/merchant/menu/products/list/runtime';
import type { Product, ProductActiveFilter } from '@/models/product';
import { createProductListPageCommands } from './productListPage.commands';

function createProductListPageContext() {
  const { actions, store } = createProductListRuntime();
  const commands = createProductListPageCommands(actions);

  return { commands, store };
}

export function useProductListPageVM() {
  const [{ commands, store }] = useState(createProductListPageContext);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ProductActiveFilter>('all');

  const storeId = useStore(activeStoreStore, (state) => state.storeId);
  const canManage = useCanManageStoreResources();

  const products = useStore(store, (state) => state.products);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);

  const loadProducts = useCallback(
    async function loadProducts(nextFilter = filter) {
      if (!storeId) return;

      await commands.loadProducts(storeId, nextFilter);
    },
    [commands, filter, storeId],
  );

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const openProduct = useCallback(
    (product: Product) => {
      void navigate(PATHS.MERCHANT.MENU_DETAIL_BUILD(product.id));
    },
    [navigate],
  );

  const openCreate = useCallback(() => {
    void navigate(PATHS.MERCHANT.MENU_CREATE);
  }, [navigate]);

  const toggleSoldOut = useCallback(
    async (product: Product) => {
      if (!storeId) return;

      await commands.toggleSoldOut(storeId, product.id, !product.isSoldOut);
    },
    [commands, storeId],
  );

  return {
    canManage,
    error,
    filter,
    isLoading,
    openCreate,
    openProduct,
    products,
    setFilter,
    toggleSoldOut,
  };
}
