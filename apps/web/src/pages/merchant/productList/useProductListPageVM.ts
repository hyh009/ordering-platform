import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useStore } from 'zustand';
import { useCanManageStoreResources } from '@/app/global/activeOrg/useActiveOrgRole';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { useAppTranslation } from '@/app/i18n';
import { getLocalizedText, languageToLocale } from '@/models/metadata';
import { buildMenuReturnState } from '@/app/routing/menuReturnState';
import { PATHS } from '@/app/routing/paths';
import { createCategoryListCommands } from '@/features/merchant/menu/categories/list/commands';
import { createCategoryListRuntime } from '@/features/merchant/menu/categories/list/runtime';
import { createProductListRuntime } from '@/features/merchant/menu/products/list/runtime';
import { useReorder } from '@/shared/hooks/useReorder';
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
  const { language } = useAppTranslation();
  const displayLocale = languageToLocale(language);
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');

  const filter = parseVisibilityFilter(searchParams.get(VISIBILITY_PARAM));
  const categoryParam = searchParams.get(CATEGORY_PARAM);

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

  const storeId = useStore(activeStoreStore, (state) => state.storeId);
  const canManage = useCanManageStoreResources();

  const allProducts = useStore(store, (state) => state.products);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);
  const categories = useStore(categoryStore, (state) => state.categories);

  // Default to the first category instead of the unfiltered "All categories"
  // state. Derived (not written to the URL) so an explicit switch back to
  // "All categories" — which clears the param — is still respected.
  const categoryFilter =
    categoryParam ?? categories[0]?.id ?? ALL_CATEGORIES;

  const categoryId =
    categoryFilter === ALL_CATEGORIES ? undefined : categoryFilter;

  const loadProducts = useCallback(
    async function loadProducts() {
      if (!storeId) return;

      await commands.loadProducts(storeId, filter, categoryId);
    },
    [categoryId, commands, filter, storeId],
  );

  const retry = useCallback(() => {
    void loadProducts();
  }, [loadProducts]);

  // Categories drive the default category filter, so track when their first
  // load settles. Until then (and with no explicit category in the URL) we hold
  // the product load to avoid a throwaway "All categories" fetch that would be
  // immediately superseded once the first-category default resolves.
  const [categoriesReady, setCategoriesReady] = useState(false);

  useEffect(() => {
    if (!storeId) return;

    void categoryCommands
      .loadCategories(storeId, 'all')
      .finally(() => setCategoriesReady(true));
  }, [categoryCommands, storeId]);

  // Fetch once per unique (store, visibility, category) target. The category
  // default is derived from the async-loaded category list, so several renders
  // resolve to the same target on mount; keying on this ref collapses those (and
  // the StrictMode double-invoke) into a single request. Direct reloads (retry,
  // post-reorder refetch) call loadProducts() and bypass this guard.
  const loadKey =
    !storeId || (!categoriesReady && categoryParam === null)
      ? null
      : `${storeId} ${filter} ${categoryId ?? ''}`;
  const lastLoadKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (loadKey === null || lastLoadKeyRef.current === loadKey) return;
    lastLoadKeyRef.current = loadKey;
    void loadProducts();
  }, [loadKey, loadProducts]);

  const canReorder = canManage && categoryFilter !== ALL_CATEGORIES;

  const reorder = useReorder(allProducts, async (orderedIds) => {
    if (!storeId || categoryFilter === ALL_CATEGORIES) {
      return { status: 'failed' as const, message: '' };
    }
    const result = await categoryCommands.reorderProducts(
      storeId,
      categoryFilter,
      orderedIds,
    );
    if (result.status === 'reordered') {
      // Refetch so the list reflects the backend's normalized order.
      await loadProducts();
    }
    return result;
  });

  // The backend already returns the selected category's products filtered and
  // sorted by its productOrder (or all products for "All categories"), so the
  // store's products are display-ready. Only search filtering and reorder-mode
  // reordering happen client-side here.
  const products = useMemo(() => {
    if (reorder.isReorderMode) return reorder.orderedItems;

    const query = search.trim().toLowerCase();
    if (query === '') return allProducts;

    return allProducts.filter((product) =>
      getLocalizedText(product.name, displayLocale)
        .toLowerCase()
        .includes(query),
    );
  }, [
    allProducts,
    displayLocale,
    reorder.isReorderMode,
    reorder.orderedItems,
    search,
  ]);

  const setCategoryFilter = useCallback(
    (next: string) => {
      // Switching categories invalidates any in-progress product reorder.
      reorder.cancel();
      // Always write the param (including 'all') so an explicit "All categories"
      // choice is not re-defaulted back to the first category on the next render.
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set(CATEGORY_PARAM, next);
          return params;
        },
        { replace: true },
      );
    },
    [reorder, setSearchParams],
  );

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
    cancelReorder: reorder.cancel,
    canReorder,
    categories,
    categoryFilter,
    enterReorderMode: reorder.enter,
    error,
    filter,
    isLoading,
    isReorderMode: reorder.isReorderMode,
    isReorderSubmitting: reorder.isSubmitting,
    moveProduct: reorder.move,
    openCreate,
    openProduct,
    products,
    reorderError: reorder.error,
    retry,
    saveReorder: reorder.save,
    search,
    setCategoryFilter,
    setFilter,
    setSearch,
    toggleSoldOut,
  };
}
