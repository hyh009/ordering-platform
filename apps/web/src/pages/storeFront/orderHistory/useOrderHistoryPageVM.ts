import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { PATHS } from '@/app/routing/paths';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';
import { useStoreFrontStoreId } from '../useStoreFrontStoreId';
import { handleStorefrontLoadFailure } from '../storeFrontFailureFeedback';
import { createOrderHistoryPageCommands } from './orderHistoryPage.commands';

export function useOrderHistoryPageVM() {
  const storeId = useStoreFrontStoreId();
  const navigate = useNavigate();
  const runtime = getStoreFrontRuntime();
  const commands = useMemo(
    () => createOrderHistoryPageCommands(runtime),
    [runtime],
  );

  const activeStoreId = useStore(
    runtime.stores.tenant,
    (state) => state.activeStoreId,
  );
  const historyStoreId = useStore(
    runtime.stores.orderHistory,
    (state) => state.storeId,
  );
  const rawItems = useStore(
    runtime.stores.orderHistory,
    (state) => state.items,
  );
  const rawIsLoading = useStore(
    runtime.stores.orderHistory,
    (state) => state.isLoading,
  );
  const rawError = useStore(
    runtime.stores.orderHistory,
    (state) => state.error,
  );
  const isCurrentStore =
    activeStoreId === storeId && historyStoreId === storeId;
  const items = isCurrentStore ? rawItems : [];
  const isLoading = !isCurrentStore || rawIsLoading;
  const error = isCurrentStore ? rawError : null;

  // The page's primary load, shared by the entry effect and retry. On a total
  // failure loadOrders has already written the error into the store, so the
  // 'page' case just lets the view render it; a redirect sends the user away.
  // `isActive` lets the effect ignore a stale resolution after unmount.
  const runInitialize = useCallback(
    async (isActive: () => boolean) => {
      const result = await commands.initialize(storeId);
      if (!isActive()) return;
      if (result.status === 'failed') {
        // loadOrders already wrote the error into the order-history store, so the
        // 'page' case needs no onPageError; only a redirect is acted on here.
        handleStorefrontLoadFailure(result, {
          onRedirect: () => {
            void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId), {
              replace: true,
            });
          },
        });
      }
    },
    [commands, navigate, storeId],
  );

  useEffect(() => {
    let active = true;
    void runInitialize(() => active);
    return () => {
      active = false;
    };
  }, [runInitialize]);

  const retry = useCallback(() => {
    void runInitialize(() => true);
  }, [runInitialize]);

  const goBack = useCallback(() => {
    void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId));
  }, [navigate, storeId]);

  const openOrder = useCallback(
    (orderId: string) => {
      void navigate(PATHS.STOREFRONT.ORDER_BUILD(storeId, orderId));
    },
    [navigate, storeId],
  );

  return { items, isLoading, error, retry, goBack, openOrder };
}
