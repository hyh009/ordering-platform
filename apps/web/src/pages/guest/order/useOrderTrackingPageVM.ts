import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useStore } from 'zustand';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { PATHS } from '@/app/routing/paths';
import { getGuestRuntime } from '@/features/guest/runtime';
import { canGuestAddOn, isOrderFinished } from '@/models/order';
import { useGuestStoreId } from '../useGuestStoreId';
import { createOrderTrackingPageCommands } from './orderTrackingPage.commands';

export function useOrderTrackingPageVM() {
  const storeId = useGuestStoreId();
  const navigate = useNavigate();
  const { orderId = '' } = useParams<{ orderId: string }>();
  const runtime = useMemo(() => getGuestRuntime(), []);
  const commands = useMemo(
    () => createOrderTrackingPageCommands(runtime),
    [runtime],
  );

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
  const order = isActiveStore ? rawOrder : null;
  const isLoading = !isActiveStore || rawIsLoading;
  const error = isActiveStore ? rawError : null;

  // Phase 1 loads the order once on entry; live SSE updates land in Phase 3.
  useEffect(() => {
    let active = true;
    async function init() {
      const result = await commands.initialize(storeId, orderId);
      if (active && result.status === 'none') {
        void navigate(PATHS.GUEST.LANDING_BUILD(storeId), { replace: true });
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [commands, navigate, orderId, storeId]);

  const refresh = useCallback(async () => {
    const result = await commands.refresh(storeId, orderId);
    if (result.status === 'failed' && result.message) {
      feedbackCommands.toast({ tone: 'error', message: result.message });
    }
  }, [commands, orderId, storeId]);

  const goHome = useCallback(() => {
    commands.leave(storeId);
    void navigate(PATHS.GUEST.LANDING_BUILD(storeId));
  }, [commands, navigate, storeId]);

  return {
    order,
    isLoading,
    error,
    refresh,
    goHome,
    finished: order ? isOrderFinished(order) : false,
    canAddOn: order ? canGuestAddOn(order) : false,
  };
}
