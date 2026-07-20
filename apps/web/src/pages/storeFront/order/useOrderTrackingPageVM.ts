import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useStore } from 'zustand';
import { PATHS } from '@/app/routing/paths';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';
import type { Order, OrderParticipantAmount } from '@/models/order';
import { getParticipantAmount, isOrderFinished } from '@/models/order';
import { useStoreFrontStoreId } from '../useStoreFrontStoreId';
import {
  handleStoreFrontFailure,
  handleStorefrontLoadFailure,
} from '../storeFrontFailureFeedback';
import { createOrderTrackingPageCommands } from './orderTrackingPage.commands';

// React Router records a monotonic `idx` on history state; idx > 0 means the
// previous entry is an in-app page we can safely return to with navigate(-1).
function hasInAppHistory(): boolean {
  const state = window.history.state as { idx?: number } | null;
  return typeof state?.idx === 'number' && state.idx > 0;
}

type HistoryView = {
  order: Order | null;
  isLoading: boolean;
  error: string | null;
};

const HISTORY_VIEW_LOADING: HistoryView = {
  order: null,
  isLoading: true,
  error: null,
};

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

  // History-order view: the whole { order, isLoading, error } triple lives here
  // in page-local state because a history order is NOT part of the shared order
  // store's load state machine — it is read-only, page-scoped, and never live.
  const [historyView, setHistoryView] =
    useState<HistoryView>(HISTORY_VIEW_LOADING);

  // Gate for the live -> history handoff below. It is a ref rather than `access`
  // because that effect depends on `access`: writing that state mid-flight would
  // make the effect tear down its own in-flight run. Holds the order id the
  // handoff has already been started for.
  const historySwitchOrderIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const activeStoreId = useStore(
    runtime.stores.tenant,
    (state) => state.activeStoreId,
  );
  const isActiveStore = activeStoreId === storeId;
  const rawStore = useStore(runtime.stores.storefront, (state) => state.store);
  const store = isActiveStore ? rawStore : null;

  // Active-path triple comes from the shared order store.
  const activeStoreOrder = useStore(
    runtime.stores.order,
    (state) => state.order,
  );
  const activeGuestToken = useStore(
    runtime.stores.session,
    (state) => state.guestToken,
  );
  const activeSessionStoreId = useStore(
    runtime.stores.session,
    (state) => state.storeId,
  );
  const activeIsLoading = useStore(
    runtime.stores.order,
    (state) => state.isLoading,
  );
  const activeError = useStore(runtime.stores.order, (state) => state.error);

  // Select display source by access mode.
  const order =
    access === 'history'
      ? historyView.order
      : isActiveStore && activeStoreOrder?.id === orderId
        ? activeStoreOrder
        : null;
  const isLoading =
    access === 'history'
      ? historyView.isLoading
      : !isActiveStore || activeIsLoading;
  const error =
    access === 'history'
      ? historyView.error
      : isActiveStore
        ? activeError
        : null;

  // The guest session participant only matches this order when it is the user's
  // own live session; for a history order it would point at an unrelated order.
  const sessionParticipantId = useStore(
    runtime.stores.session,
    (state) => state.participantId,
  );
  const myParticipantId =
    access === 'active' && isActiveStore ? sessionParticipantId : null;
  const myAmount: OrderParticipantAmount | undefined =
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

  // The page's primary-resource load. Shared by the entry effect and retry so
  // both run the exact same flow. `isActive` lets the effect ignore a stale
  // resolution after unmount; retry passes a constant-true gate.
  const runInitialize = useCallback(
    async (isActive: () => boolean) => {
      const result = await commands.initialize(storeId, orderId);

      if (!isActive()) return;

      // The result always carries `access` on loaded/failed branches.
      if ('access' in result) {
        setAccess(result.access);
      }

      if (result.status === 'redirect') {
        void navigate(
          result.target === 'history'
            ? PATHS.STOREFRONT.ORDER_HISTORY_BUILD(storeId)
            : PATHS.STOREFRONT.LANDING_BUILD(storeId),
          { replace: true },
        );
        return;
      }

      if (result.status === 'loaded') {
        if (result.access === 'history') {
          setHistoryView({
            order: result.order,
            isLoading: false,
            error: null,
          });
        }
        // Active path: shared order store is already written by loadOrder.
        return;
      }

      if (result.status === 'failed') {
        // Align with the refactored rail used by cart/menu: the load axis
        // decides between page-error, redirect, or silent. onPageError
        // dispatches by access mode so error lands in the right owner.
        // `result.access` is always present on a failed init result.
        const failedAccess = result.access;
        handleStorefrontLoadFailure(result, {
          onRedirect: () => {
            void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId), {
              replace: true,
            });
          },
          onPageError: (message) => {
            if (failedAccess === 'history') {
              setHistoryView({ order: null, isLoading: false, error: message });
            } else {
              commands.reportActiveLoadFailure(message);
            }
          },
          onSilent: () => {
            // No message belongs on screen, but the history path's `isLoading`
            // is owned here, so it still has to settle or the page keeps
            // spinning with nothing in flight. The active path's flag lives in
            // the order store and is already subsumed by `!isActiveStore` while
            // the handoff to the newly active store completes.
            if (failedAccess === 'history') {
              setHistoryView({ order: null, isLoading: false, error: null });
            }
          },
        });
      }
    },
    [commands, navigate, orderId, storeId],
  );

  // Loads the order snapshot on entry; the layout-level SSE connection keeps
  // the active order live (new batches, status moves) without a refresh.
  useEffect(() => {
    let active = true;
    async function init() {
      // Reset to loading before the async call so a stale result from a prior
      // orderId doesn't flash while the new one loads. Done inside the async
      // function to avoid synchronous setState in the effect body.
      if (active) setHistoryView(HISTORY_VIEW_LOADING);
      await runInitialize(() => active);
    }
    void init();
    return () => {
      active = false;
    };
  }, [runInitialize]);

  const retry = useCallback(() => {
    setHistoryView(HISTORY_VIEW_LOADING);
    void runInitialize(() => true);
  }, [runInitialize]);

  const refresh = useCallback(async () => {
    const result = await commands.refresh(storeId, orderId, access);
    if (result.status === 'redirect') {
      void navigate(
        result.target === 'history'
          ? PATHS.STOREFRONT.ORDER_HISTORY_BUILD(storeId)
          : PATHS.STOREFRONT.LANDING_BUILD(storeId),
        { replace: true },
      );
      return;
    }
    if (result.status === 'failed') {
      handleStoreFrontFailure(result);
      return;
    }
    // History refresh: update the page-local view with the refreshed order.
    // When access === 'history', the refresh command uses fetchOrderWithToken
    // which returns `{ status: 'loaded'; order: Order }`.
    if (
      result.status === 'loaded' &&
      access === 'history' &&
      'order' in result
    ) {
      setHistoryView({ order: result.order, isLoading: false, error: null });
    }
  }, [access, commands, navigate, orderId, storeId]);

  // The live session for this order can disappear while the page is open (an
  // explicit leave, or a request that rejects the token). The page then re-reads
  // the same order through its stored history token and becomes read-only.
  //
  // `access` flips only once that re-read has resolved, together with the view it
  // selects. Flipping it up front would change this effect's own dependencies, so
  // React would run the cleanup and cancel the very request whose result is the
  // only thing that can clear the loading state.
  useEffect(() => {
    const hasRouteOrderSnapshot =
      isActiveStore && activeStoreOrder?.id === orderId;
    const hasRouteActiveSession =
      activeSessionStoreId === storeId && !!activeGuestToken;
    if (
      access !== 'active' ||
      !hasRouteOrderSnapshot ||
      hasRouteActiveSession ||
      historySwitchOrderIdRef.current === orderId
    ) {
      return;
    }
    historySwitchOrderIdRef.current = orderId;

    async function switchToHistory() {
      const result = await commands.refresh(storeId, orderId, 'history');
      // Only an unmount or a move to a different order invalidates this handoff
      // — deliberately not the effect's own re-run, so unrelated store churn
      // cannot strand the page on a live view whose session is already gone.
      if (
        !isMountedRef.current ||
        historySwitchOrderIdRef.current !== orderId
      ) {
        return;
      }

      if (result.status === 'redirect') {
        void navigate(
          result.target === 'history'
            ? PATHS.STOREFRONT.ORDER_HISTORY_BUILD(storeId)
            : PATHS.STOREFRONT.LANDING_BUILD(storeId),
          { replace: true },
        );
        return;
      }

      if (result.status === 'failed') {
        handleStorefrontLoadFailure(result, {
          onRedirect: () => {
            void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId), {
              replace: true,
            });
          },
          onPageError: (message) => {
            setAccess('history');
            setHistoryView({ order: null, isLoading: false, error: message });
          },
          onSilent: () => {
            // Benign store-switch race with nothing to show. Release the gate so
            // the handoff can be retried once the stores settle, rather than
            // leaving the page on a live view whose session is already gone.
            historySwitchOrderIdRef.current = null;
          },
        });
        return;
      }

      if (result.status === 'loaded' && 'order' in result) {
        // Both writes land in one commit, so the page never renders `history`
        // access against a history view that has not been filled in yet.
        setAccess('history');
        setHistoryView({ order: result.order, isLoading: false, error: null });
      }
    }
    void switchToHistory();
  }, [
    access,
    activeGuestToken,
    activeSessionStoreId,
    activeStoreOrder,
    commands,
    isActiveStore,
    navigate,
    orderId,
    storeId,
  ]);

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
    retry,
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
