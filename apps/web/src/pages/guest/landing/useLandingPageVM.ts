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

type ResumeTarget = 'cart' | 'order' | null;

export function useLandingPageVM() {
  const storeId = useGuestStoreId();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const runtime = useMemo(() => getGuestRuntime(), []);

  const tableNumber = searchParams.get('table') ?? undefined;

  const store = useStore(runtime.stores.storefront, (state) => state.store);
  const isLoading = useStore(
    runtime.stores.storefront,
    (state) => state.isLoading,
  );
  const error = useStore(runtime.stores.storefront, (state) => state.error);
  const isMutating = useStore(runtime.stores.cart, (state) => state.isMutating);

  const [resumeTarget, setResumeTarget] = useState<ResumeTarget>(null);
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
      await runtime.commands.storefront.loadStorefront(storeId);
      const result = await runtime.commands.session.restoreSession(storeId);
      if (!active) return;

      if (result.status === 'cart') {
        setResumeTarget('cart');
      } else if (result.status === 'order') {
        setResumeTarget('order');
      } else if (result.status === 'ended') {
        feedbackCommands.toast({
          tone: 'info',
          message: tDefault(
            'guest.landing.previousOrderEnded',
            'Your previous order has ended.',
          ),
        });
      }
    }

    void init();

    return () => {
      active = false;
    };
    // `tDefault` is a stable module import, not a reactive dependency; keeping
    // it out of the deps prevents the init effect from re-running every render.
  }, [runtime, storeId]);

  const startOrder = useCallback(async () => {
    if (!storeId || !selectedOrderType) return;

    const result = await runtime.commands.cart.createCart(storeId, {
      orderType: selectedOrderType,
      ...(tableNumber !== undefined ? { tableNumber } : {}),
    });

    if (result.status === 'created') {
      void navigate(PATHS.GUEST.MENU_BUILD(storeId));
      return;
    }

    feedbackCommands.toast({ tone: 'error', message: result.message });
  }, [navigate, runtime, selectedOrderType, storeId, tableNumber]);

  const resume = useCallback(() => {
    if (resumeTarget === 'cart') {
      void navigate(PATHS.GUEST.MENU_BUILD(storeId));
      return;
    }

    if (resumeTarget === 'order') {
      const order = runtime.stores.order.getState().order;
      if (order) {
        void navigate(PATHS.GUEST.ORDER_BUILD(storeId, order.id));
      }
    }
  }, [navigate, resumeTarget, runtime, storeId]);

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
    resumeTarget,
    startOrder,
    resume,
  };
}
