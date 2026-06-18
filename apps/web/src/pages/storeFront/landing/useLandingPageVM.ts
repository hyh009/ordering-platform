import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useStore } from 'zustand';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { tDefault } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import {
  toParticipantIdentitySubmission,
  useParticipantIdentityForm,
} from '@/features/storeFront/components/ParticipantIdentitySelector';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';
import { isStoreOpenNow } from '@/models/store';
import type { StoreOrderType } from '@/models/store';
import { useStoreFrontStoreId } from '../useStoreFrontStoreId';
import { handleStoreFrontFailure } from '../storeFrontFailureFeedback';
import { createLandingPageCommands } from './landingPage.commands';

export function useLandingPageVM() {
  const storeId = useStoreFrontStoreId();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const runtime = getStoreFrontRuntime();
  const commands = useMemo(() => createLandingPageCommands(runtime), [runtime]);

  const tableNumber = searchParams.get('table') ?? undefined;

  const activeStoreId = useStore(
    runtime.stores.tenant,
    (state) => state.activeStoreId,
  );
  const isActiveStore = activeStoreId === storeId;
  const rawStore = useStore(runtime.stores.storefront, (state) => state.store);
  const rawIsLoading = useStore(
    runtime.stores.storefront,
    (state) => state.isLoading,
  );
  const rawError = useStore(runtime.stores.storefront, (state) => state.error);
  const rawIsMutating = useStore(
    runtime.stores.cart,
    (state) => state.isMutating,
  );
  const store = isActiveStore ? rawStore : null;
  const isLoading = !isActiveStore || rawIsLoading;
  const error = isActiveStore ? rawError : null;
  const isMutating = isActiveStore && rawIsMutating;

  const [canResume, setCanResume] = useState(false);
  const [hasOrderHistory, setHasOrderHistory] = useState(false);
  const [resumeStoreId, setResumeStoreId] = useState<string | null>(null);
  const [entryMode, setEntryMode] = useState<
    'chooser' | 'new-order' | 'identity'
  >('chooser');
  const [manualOrderType, setManualOrderType] = useState<StoreOrderType | null>(
    null,
  );
  const {
    values: identityValues,
    setValue: setIdentityValues,
    reset: resetIdentity,
  } = useParticipantIdentityForm();

  const enabledOrderTypes = useMemo<StoreOrderType[]>(
    () => store?.orderModes.map((mode) => mode.type) ?? [],
    [store],
  );

  const selectedOrderType = manualOrderType;

  const isOpen = useMemo(
    () => (store ? isStoreOpenNow(store.businessHours) : false),
    [store],
  );

  useEffect(() => {
    if (!storeId) return;

    let active = true;

    async function init() {
      const result = await commands.initialize(storeId);
      if (!active) return;
      setCanResume(result.hasStoredSession);
      setHasOrderHistory(result.hasOrderHistory);
      setResumeStoreId(storeId);
    }

    void init();

    return () => {
      active = false;
    };
    // `tDefault` is a stable module import, not a reactive dependency; keeping
    // it out of the deps prevents the init effect from re-running every render.
  }, [commands, storeId]);

  const selectOrderType = useCallback(
    (orderType: StoreOrderType) => {
      setManualOrderType(orderType);
      resetIdentity();
      setEntryMode('identity');
    },
    [resetIdentity],
  );

  const createOrder = useCallback(async () => {
    if (!storeId || !manualOrderType) return;
    const result = await commands.startOrder(storeId, {
      orderType: manualOrderType,
      ...(tableNumber !== undefined ? { tableNumber } : {}),
      ...toParticipantIdentitySubmission(identityValues),
    });

    if (result.status === 'created') {
      void navigate(PATHS.STOREFRONT.MENU_BUILD(storeId));
      return;
    }

    handleStoreFrontFailure(result);
  }, [commands, identityValues, manualOrderType, navigate, storeId, tableNumber]);

  const confirmAbandonCurrentSession = useCallback(async () => {
    if (!(resumeStoreId === storeId && canResume)) return true;

    const confirmed = await feedbackCommands.confirm({
      title: tDefault(
        'guest.landing.abandonCurrentOrderTitle',
        'Leave your current order?',
      ),
      message: tDefault(
        'guest.landing.abandonCurrentOrderMessage',
        'You will no longer be able to resume this order.',
      ),
      confirmLabel: tDefault(
        'guest.landing.abandonCurrentOrderConfirm',
        'Leave order',
      ),
      tone: 'error',
    });
    if (!confirmed) return false;

    const result = await commands.abandonCurrentSession(storeId);
    if (result.status === 'left') {
      setCanResume(false);
      return true;
    }

    if (result.status === 'failed') {
      handleStoreFrontFailure(result);
    }
    return false;
  }, [canResume, commands, resumeStoreId, storeId]);

  const goToJoin = useCallback(async () => {
    if (!(await confirmAbandonCurrentSession())) return;
    void navigate(PATHS.STOREFRONT.JOIN_ENTRY_BUILD(storeId));
  }, [confirmAbandonCurrentSession, navigate, storeId]);

  const showNewOrder = useCallback(async () => {
    if (!(await confirmAbandonCurrentSession())) return;
    setManualOrderType(null);
    setEntryMode('new-order');
  }, [confirmAbandonCurrentSession]);

  const cancelNewOrder = useCallback(() => {
    setManualOrderType(null);
    setEntryMode('chooser');
  }, []);

  const backToOrderType = useCallback(() => {
    setManualOrderType(null);
    setEntryMode('new-order');
  }, []);

  const goToOrderHistory = useCallback(() => {
    void navigate(PATHS.STOREFRONT.ORDER_HISTORY_BUILD(storeId));
  }, [navigate, storeId]);

  const resume = useCallback(async () => {
    const result = await commands.resume(storeId);
    if (result.status === 'cart') {
      void navigate(PATHS.STOREFRONT.MENU_BUILD(storeId));
      return;
    }

    if (result.status === 'order') {
      void navigate(PATHS.STOREFRONT.ORDER_BUILD(storeId, result.orderId));
      return;
    }

    if (result.status === 'ended') {
      setCanResume(false);
      await feedbackCommands.alert({
        title: tDefault(
          'guest.landing.previousOrderEnded',
          'Your previous order has ended.',
        ),
        message: tDefault(
          'guest.landing.startNewOrderPrompt',
          'You can start a new order now.',
        ),
        confirmLabel: tDefault('guest.landing.startOrder', 'New order'),
      });
      setManualOrderType(null);
      setEntryMode('new-order');
      return;
    }

    if (result.status === 'failed') {
      handleStoreFrontFailure(result);
    }
  }, [commands, navigate, storeId]);

  return {
    store,
    isLoading,
    error,
    isOpen,
    isMutating,
    tableNumber,
    enabledOrderTypes,
    selectedOrderType,
    entryMode,
    identityValues,
    setIdentityValues,
    canResume: resumeStoreId === storeId && canResume,
    hasOrderHistory: resumeStoreId === storeId && hasOrderHistory,
    selectOrderType,
    createOrder,
    resume,
    goToJoin,
    showNewOrder,
    cancelNewOrder,
    backToOrderType,
    goToOrderHistory,
  };
}
