import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useStore } from 'zustand';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { PATHS } from '@/app/routing/paths';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';
import { canGuestAddOn, isOrderFinished } from '@/models/order';
import { useStoreFrontStoreId } from '../useStoreFrontStoreId';
import { createOrderTrackingPageCommands } from './orderTrackingPage.commands';

export function useOrderTrackingPageVM() {
  const storeId = useStoreFrontStoreId();
  const navigate = useNavigate();
  const { orderId = '' } = useParams<{ orderId: string }>();
  const runtime = getStoreFrontRuntime();
  const commands = useMemo(
    () => createOrderTrackingPageCommands(runtime),
    [runtime],
  );
  const [access, setAccess] = useState<'active' | 'history'>('active');

  const activeStoreId = useStore(
    runtime.stores.tenant,
    (state) => state.activeStoreId,
  );
  const isActiveStore = activeStoreId === storeId;
  const rawOrder = useStore(runtime.stores.order, (state) => state.order);
  const rawIsLoading = useStore(
    runtime.stores.order,
    (state) => state.isLoading,
  );
  const rawError = useStore(runtime.stores.order, (state) => state.error);
  const order = isActiveStore && rawOrder?.id === orderId ? rawOrder : null;
  const isLoading = !isActiveStore || rawIsLoading;
  const error = isActiveStore ? rawError : null;

  // Phase 1 loads the order once on entry; live SSE updates land in Phase 3.
  useEffect(() => {
    let active = true;
    async function init() {
      const result = await commands.initialize(storeId, orderId);
      if (active && 'access' in result) {
        setAccess(result.access);
      }
      if (active && result.status === 'none') {
        void navigate(
          result.target === 'history'
            ? PATHS.STOREFRONT.ORDER_HISTORY_BUILD(storeId)
            : PATHS.STOREFRONT.LANDING_BUILD(storeId),
          {
            replace: true,
          },
        );
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [commands, navigate, orderId, storeId]);

  const refresh = useCallback(async () => {
    const result = await commands.refresh(storeId, orderId, access);
    if (result.status === 'none') {
      void navigate(
        access === 'history'
          ? PATHS.STOREFRONT.ORDER_HISTORY_BUILD(storeId)
          : PATHS.STOREFRONT.LANDING_BUILD(storeId),
        { replace: true },
      );
      return;
    }
    if (result.status === 'failed' && result.message) {
      feedbackCommands.toast({ tone: 'error', message: result.message });
    }
  }, [access, commands, navigate, orderId, storeId]);

  const goHome = useCallback(() => {
    if (access === 'active') {
      commands.leave(storeId);
      void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId));
      return;
    }
    void navigate(PATHS.STOREFRONT.ORDER_HISTORY_BUILD(storeId));
  }, [access, commands, navigate, storeId]);

  return {
    order,
    isLoading,
    error,
    refresh,
    goHome,
    finished: order ? isOrderFinished(order) : false,
    canAddOn: order ? canGuestAddOn(order) : false,
    isHistoryOrder: access === 'history',
  };
}
