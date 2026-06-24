import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useStore } from 'zustand';
import type { OrderParticipantAmountDto } from '@repo/shared';
import { PATHS } from '@/app/routing/paths';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';
import { getParticipantAmount, isOrderFinished } from '@/models/order';
import { useStoreFrontStoreId } from '../useStoreFrontStoreId';
import { handleStoreFrontFailure } from '../storeFrontFailureFeedback';
import { createOrderTrackingPageCommands } from './orderTrackingPage.commands';

// React Router records a monotonic `idx` on history state; idx > 0 means the
// previous entry is an in-app page we can safely return to with navigate(-1).
function hasInAppHistory(): boolean {
  const state = window.history.state as { idx?: number } | null;
  return typeof state?.idx === 'number' && state.idx > 0;
}

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
  const rawStore = useStore(runtime.stores.storefront, (state) => state.store);
  const store = isActiveStore ? rawStore : null;
  const rawOrder = useStore(runtime.stores.order, (state) => state.order);
  const rawIsLoading = useStore(
    runtime.stores.order,
    (state) => state.isLoading,
  );
  const rawError = useStore(runtime.stores.order, (state) => state.error);
  const order = isActiveStore && rawOrder?.id === orderId ? rawOrder : null;
  const isLoading = !isActiveStore || rawIsLoading;
  const error = isActiveStore ? rawError : null;

  // The guest session participant only matches this order when it is the user's
  // own live session; for a history order it would point at an unrelated order.
  const sessionParticipantId = useStore(
    runtime.stores.session,
    (state) => state.participantId,
  );
  const myParticipantId =
    access === 'active' && isActiveStore ? sessionParticipantId : null;
  const myAmount: OrderParticipantAmountDto | undefined =
    order && myParticipantId
      ? getParticipantAmount(order, myParticipantId)
      : undefined;

  // Page-flow state for the per-participant detail (a later phase renders the
  // overlay from this selection; here we only own the state + handlers).
  const [selectedParticipantId, setSelectedParticipantId] = useState<
    string | null
  >(null);
  const openParticipantDetail = useCallback((participantId: string) => {
    setSelectedParticipantId(participantId);
  }, []);
  const closeParticipantDetail = useCallback(() => {
    setSelectedParticipantId(null);
  }, []);

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
    if (result.status === 'failed') {
      handleStoreFrontFailure(result);
    }
  }, [access, commands, navigate, orderId, storeId]);

  // Back arrow: return to the previous page only when it belongs to this app;
  // otherwise (deep link / fresh tab) fall back to a safe storefront page.
  const goBack = useCallback(() => {
    if (hasInAppHistory()) {
      void navigate(-1);
      return;
    }
    void navigate(
      access === 'history'
        ? PATHS.STOREFRONT.ORDER_HISTORY_BUILD(storeId)
        : PATHS.STOREFRONT.LANDING_BUILD(storeId),
      { replace: true },
    );
  }, [access, navigate, storeId]);

  const goHome = useCallback(() => {
    if (access === 'active') {
      commands.leave(storeId);
      void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId));
      return;
    }
    void navigate(PATHS.STOREFRONT.ORDER_HISTORY_BUILD(storeId));
  }, [access, commands, navigate, storeId]);

  // Add-on round: send the participant back to the menu, where they stage the
  // next round into the still-active shared cart and submit it as a new batch.
  const addMore = useCallback(() => {
    void navigate(PATHS.STOREFRONT.MENU_BUILD(storeId));
  }, [navigate, storeId]);

  // Add-on is only offered for the participant's own live session, not when
  // viewing a past order from local history.
  const canAddOn = order ? order.canAddOn && access === 'active' : false;

  return {
    order,
    store,
    isLoading,
    error,
    refresh,
    goBack,
    goHome,
    addMore,
    finished: order ? isOrderFinished(order) : false,
    canAddOn,
    isHistoryOrder: access === 'history',
    myParticipantId,
    myAmount,
    selectedParticipantId,
    openParticipantDetail,
    closeParticipantDetail,
  };
}
