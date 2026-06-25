import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useStore } from 'zustand';
import { useCanManageStoreResources } from '@/app/global/activeOrg/useActiveOrgRole';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { buildMenuReturnState } from '@/app/routing/menuReturnState';
import { PATHS } from '@/app/routing/paths';
import { createCategoryListCommands } from '@/features/merchant/menu/categories/list/commands';
import { createCategoryListRuntime } from '@/features/merchant/menu/categories/list/runtime';
import { createProductListRuntime } from '@/features/merchant/menu/products/list/runtime';
import type { Product, ProductActiveFilter } from '@/models/product';
import { handleMerchantFailure } from '../merchantFailureFeedback';
import { createProductListPageCommands } from './productListPage.commands';

const ALL_CATEGORIES = 'all';
const CATEGORY_PARAM = 'category';
const VISIBILITY_PARAM = 'active';

function parseVisibilityFilter(value: string | null): ProductActiveFilter {
  return value === 'true' || value === 'false' ? value : 'all';
}

function createProductListPageContext() {
  const { actions, store } = createProductListRuntime();
  const commands = createProductListPageCommands(actions);

  const categoryRuntime = createCategoryListRuntime();
  const categoryCommands = createCategoryListCommands(categoryRuntime.actions);

  return {
    categoryCommands,
    categoryStore: categoryRuntime.store,
    commands,
    store,
  };
}

export function useProductListPageVM() {
  const [{ categoryCommands, categoryStore, commands, store }] = useState(
    createProductListPageContext,
  );
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const filter = parseVisibilityFilter(searchParams.get(VISIBILITY_PARAM));
  const categoryFilter = searchParams.get(CATEGORY_PARAM) ?? ALL_CATEGORIES;

  const setParam = useCallback(
    (param: string, value: string, allValue: string) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (value === allValue) params.delete(param);
          else params.set(param, value);
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setFilter = useCallback(
    (next: ProductActiveFilter) => setParam(VISIBILITY_PARAM, next, 'all'),
    [setParam],
  );

  const setCategoryFilter = useCallback(
    (next: string) => setParam(CATEGORY_PARAM, next, ALL_CATEGORIES),
    [setParam],
  );

  const storeId = useStore(activeStoreStore, (state) => state.storeId);
  const canManage = useCanManageStoreResources();

  const allProducts = useStore(store, (state) => state.products);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);
  const categories = useStore(categoryStore, (state) => state.categories);

  const products = useMemo(() => {
    if (categoryFilter === ALL_CATEGORIES) return allProducts;

    return allProducts.filter((product) =>
      product.categoryIds.includes(categoryFilter),
    );
  }, [allProducts, categoryFilter]);

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

  const retry = useCallback(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!storeId) return;

    void categoryCommands.loadCategories(storeId, 'all');
  }, [categoryCommands, storeId]);

  const openProduct = useCallback(
    (product: Product) => {
      void navigate(PATHS.MERCHANT.MENU_DETAIL_BUILD(product.id), {
        state: buildMenuReturnState(location.search),
      });
    },
    [location.search, navigate],
  );

  const openCreate = useCallback(() => {
    void navigate(PATHS.MERCHANT.MENU_CREATE);
  }, [navigate]);

  const toggleSoldOut = useCallback(
    async (product: Product) => {
      if (!storeId) return;

      const result = await commands.toggleSoldOut(
        storeId,
        product.id,
        !product.isSoldOut,
      );
      if (result.status === 'failed') {
        handleMerchantFailure(result);
      }
    },
    [commands, storeId],
  );

  return {
    canManage,
    categories,
    categoryFilter,
    error,
    filter,
    isLoading,
    openCreate,
    openProduct,
    products,
    retry,
    setCategoryFilter,
    setFilter,
    toggleSoldOut,
  };
}
