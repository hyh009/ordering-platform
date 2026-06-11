import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { PATHS } from '@/app/routing/paths';
import { getGuestRuntime } from '@/features/guest/runtime';
import { canGuestAddOn, isOrderFinished } from '@/models/order';
import { useGuestStoreId } from '../useGuestStoreId';

export function useOrderTrackingPageVM() {
  const storeId = useGuestStoreId();
  const navigate = useNavigate();
  const runtime = useMemo(() => getGuestRuntime(), []);

  const order = useStore(runtime.stores.order, (state) => state.order);
  const isLoading = useStore(runtime.stores.order, (state) => state.isLoading);
  const error = useStore(runtime.stores.order, (state) => state.error);
  const guestToken = useStore(
    runtime.stores.session,
    (state) => state.guestToken,
  );

  // Phase 1 loads the order once on entry; live SSE updates land in Phase 3.
  useEffect(() => {
    if (!guestToken) {
      void navigate(PATHS.GUEST.LANDING_BUILD(storeId), { replace: true });
      return;
    }
    void runtime.commands.order.loadOrder();
  }, [guestToken, navigate, runtime, storeId]);

  const refresh = useCallback(async () => {
    const result = await runtime.commands.order.loadOrder();
    if (result.status === 'failed') {
      feedbackCommands.toast({ tone: 'error', message: result.message });
    }
  }, [runtime]);

  const goHome = useCallback(() => {
    runtime.commands.session.clearSession();
    void navigate(PATHS.GUEST.LANDING_BUILD(storeId));
  }, [navigate, runtime, storeId]);

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
