import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useStore } from 'zustand';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { PATHS } from '@/app/routing/paths';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';
import { useStoreFrontStoreId } from '../useStoreFrontStoreId';
import { createJoinPageCommands } from './joinPage.commands';

export function useJoinPageVM() {
  const storeId = useStoreFrontStoreId();
  const { joinCode } = useParams<{ joinCode: string }>();
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

  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (!storeId) return;
    void commands.initialize(storeId);
  }, [commands, storeId]);

  const rawStore = useStore(runtime.stores.storefront, (state) => state.store);
  const store = isActiveStore ? rawStore : null;

  const join = useCallback(async () => {
    if (!joinCode) return;

    const trimmed = displayName.trim();
    const result = await commands.join(storeId, {
      joinCode,
      ...(trimmed.length > 0 ? { displayName: trimmed } : {}),
    });

    if (result.status === 'joined') {
      if (result.target === 'order') {
        if (result.orderId) {
          void navigate(PATHS.STOREFRONT.ORDER_BUILD(storeId, result.orderId));
          return;
        }
      }
      void navigate(PATHS.STOREFRONT.MENU_BUILD(storeId));
      return;
    }

    if (result.message) {
      feedbackCommands.toast({ tone: 'error', message: result.message });
    }
  }, [commands, displayName, joinCode, navigate, storeId]);

  return {
    store,
    displayName,
    setDisplayName,
    isMutating,
    join,
  };
}
