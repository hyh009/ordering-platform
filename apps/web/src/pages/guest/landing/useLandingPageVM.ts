import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useStore } from 'zustand';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { tDefault } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import { getGuestRuntime } from '@/features/guest/runtime';
import { isStoreOpenNow } from '@/models/guestMenu';
import type { StoreOrderType } from '@/models/store';
import { useGuestStoreId } from '../useGuestStoreId';
import { createLandingPageCommands } from './landingPage.commands';

export function useLandingPageVM() {
  const storeId = useGuestStoreId();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const runtime = useMemo(() => getGuestRuntime(), []);
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
  const [resumeStoreId, setResumeStoreId] = useState<string | null>(null);
  const [manualOrderType, setManualOrderType] = useState<StoreOrderType | null>(
    null,
  );

  const enabledOrderTypes = useMemo<StoreOrderType[]>(
    () => store?.orderModes.map((mode) => mode.type) ?? [],
    [store],
  );

  // Auto-select the only enabled order type so the view can skip the picker.
  const selectedOrderType =
    manualOrderType ??
    (enabledOrderTypes.length === 1 ? (enabledOrderTypes[0] ?? null) : null);

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
      setResumeStoreId(storeId);
    }

    void init();

    return () => {
      active = false;
    };
    // `tDefault` is a stable module import, not a reactive dependency; keeping
    // it out of the deps prevents the init effect from re-running every render.
  }, [commands, storeId]);

  const startOrder = useCallback(async () => {
    if (!storeId || !selectedOrderType) return;

    const result = await commands.startOrder(storeId, {
      orderType: selectedOrderType,
      ...(tableNumber !== undefined ? { tableNumber } : {}),
    });

    if (result.status === 'created') {
      void navigate(PATHS.GUEST.MENU_BUILD(storeId));
      return;
    }

    if (result.message) {
      feedbackCommands.toast({ tone: 'error', message: result.message });
    }
  }, [commands, navigate, selectedOrderType, storeId, tableNumber]);

  const resume = useCallback(async () => {
    const result = await commands.resume(storeId);
    if (result.status === 'cart') {
      void navigate(PATHS.GUEST.MENU_BUILD(storeId));
      return;
    }

    if (result.status === 'order') {
      void navigate(PATHS.GUEST.ORDER_BUILD(storeId, result.orderId));
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
        confirmLabel: tDefault('guest.landing.startOrder', 'Start ordering'),
      });
      if (selectedOrderType) {
        await startOrder();
      }
      return;
    }

    if (result.status === 'failed' && result.message) {
      feedbackCommands.toast({ tone: 'error', message: result.message });
    }
  }, [commands, navigate, selectedOrderType, startOrder, storeId]);

  return {
    store,
    isLoading,
    error,
    isOpen,
    isMutating,
    tableNumber,
    enabledOrderTypes,
    selectedOrderType,
    setSelectedOrderType: setManualOrderType,
    canResume: resumeStoreId === storeId && canResume,
    startOrder,
    resume,
  };
}
