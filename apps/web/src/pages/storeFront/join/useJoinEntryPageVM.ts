import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { PATHS } from '@/app/routing/paths';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';
import { useStoreFrontStoreId } from '../useStoreFrontStoreId';
import { createJoinPageCommands } from './joinPage.commands';

export function useJoinEntryPageVM() {
  const storeId = useStoreFrontStoreId();
  const navigate = useNavigate();
  const runtime = getStoreFrontRuntime();
  const commands = useMemo(() => createJoinPageCommands(runtime), [runtime]);

  const activeStoreId = useStore(
    runtime.stores.tenant,
    (state) => state.activeStoreId,
  );
  const isActiveStore = activeStoreId === storeId;
  const rawIsMutating = useStore(
    runtime.stores.cart,
    (state) => state.isMutating,
  );
  const isMutating = isActiveStore && rawIsMutating;

  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (!storeId) return;
    void commands.initialize(storeId);
  }, [commands, storeId]);

  const goBack = useCallback(() => {
    void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId));
  }, [navigate, storeId]);

  const join = useCallback(async () => {
    const trimmedCode = joinCode.trim().toUpperCase();
    if (!trimmedCode) return;

    const result = await commands.join(storeId, { joinCode: trimmedCode });

    if (result.status === 'joined') {
      if (result.target === 'order' && result.orderId) {
        void navigate(PATHS.STOREFRONT.ORDER_BUILD(storeId, result.orderId));
        return;
      }
      void navigate(PATHS.STOREFRONT.MENU_BUILD(storeId));
      return;
    }

    if (result.message) {
      feedbackCommands.toast({ tone: 'error', message: result.message });
    }
  }, [commands, joinCode, navigate, storeId]);

  return { joinCode, setJoinCode, isMutating, goBack, join };
}
