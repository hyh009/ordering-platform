import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useStore } from 'zustand';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { PATHS } from '@/app/routing/paths';
import { getGuestRuntime } from '@/features/guest/runtime';
import { useGuestStoreId } from '../useGuestStoreId';

export function useJoinPageVM() {
  const storeId = useGuestStoreId();
  const { joinCode } = useParams<{ joinCode: string }>();
  const navigate = useNavigate();
  const runtime = useMemo(() => getGuestRuntime(), []);

  const isMutating = useStore(runtime.stores.cart, (state) => state.isMutating);

  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (!storeId) return;
    void runtime.commands.storefront.loadStorefront(storeId);
  }, [runtime, storeId]);

  const store = useStore(runtime.stores.storefront, (state) => state.store);

  const join = useCallback(async () => {
    if (!joinCode) return;

    const trimmed = displayName.trim();
    const result = await runtime.commands.cart.joinCart(storeId, {
      joinCode,
      ...(trimmed.length > 0 ? { displayName: trimmed } : {}),
    });

    if (result.status === 'joined') {
      if (result.target === 'order') {
        const order = runtime.stores.order.getState().order;
        if (order) {
          void navigate(PATHS.GUEST.ORDER_BUILD(storeId, order.id));
          return;
        }
      }
      void navigate(PATHS.GUEST.MENU_BUILD(storeId));
      return;
    }

    feedbackCommands.toast({ tone: 'error', message: result.message });
  }, [displayName, joinCode, navigate, runtime, storeId]);

  return {
    store,
    displayName,
    setDisplayName,
    isMutating,
    join,
  };
}
