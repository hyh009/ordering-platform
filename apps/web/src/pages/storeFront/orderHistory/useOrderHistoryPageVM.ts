import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { PATHS } from '@/app/routing/paths';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';
import { useStoreFrontStoreId } from '../useStoreFrontStoreId';
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

  useEffect(() => {
    let active = true;
    async function init() {
      const result = await commands.initialize(storeId);
      if (active && result.status === 'failed' && result.message) {
        feedbackCommands.toast({ tone: 'error', message: result.message });
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [commands, storeId]);

  const goBack = useCallback(() => {
    void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId));
  }, [navigate, storeId]);

  const openOrder = useCallback(
    (orderId: string) => {
      void navigate(PATHS.STOREFRONT.ORDER_BUILD(storeId, orderId));
    },
    [navigate, storeId],
  );

  return { items, isLoading, error, goBack, openOrder };
}
