import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { useAppTranslation } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';
import type { CartItem, OrderingParticipant } from '@/models/cart';
import { useStoreFrontStoreId } from '../useStoreFrontStoreId';
import { handleStoreFrontFailure } from '../storeFrontFailureFeedback';
import { createCartPageCommands } from './cartPage.commands';

export function useCartPageVM() {
  const storeId = useStoreFrontStoreId();
  const navigate = useNavigate();
  const { tDefault } = useAppTranslation();
  const runtime = getStoreFrontRuntime();
  const commands = useMemo(() => createCartPageCommands(runtime), [runtime]);

  const activeStoreId = useStore(
    runtime.stores.tenant,
    (state) => state.activeStoreId,
  );
  const isActiveStore = activeStoreId === storeId;
  const rawCart = useStore(runtime.stores.cart, (state) => state.cart);
  const rawIsLoading = useStore(
    runtime.stores.cart,
    (state) => state.isLoading,
  );
  const rawIsMutating = useStore(
    runtime.stores.cart,
    (state) => state.isMutating,
  );
  const rawParticipantId = useStore(
    runtime.stores.session,
    (state) => state.participantId,
  );
  const cart = isActiveStore ? rawCart : null;
  const isLoading = !isActiveStore || rawIsLoading;
  const isMutating = isActiveStore && rawIsMutating;
  const participantId = isActiveStore ? rawParticipantId : null;

  useEffect(() => {
    let active = true;
    async function init() {
      const result = await commands.initialize(storeId);
      if (active && result.status === 'none') {
        void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId), { replace: true });
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [commands, navigate, storeId]);

  const participantGroups = useMemo((): Array<{
    participant: OrderingParticipant;
    items: CartItem[];
    isCurrentUser: boolean;
  }> => {
    if (!cart) return [];
    const byId = new Map<string, CartItem[]>();
    for (const item of cart.items) {
      const key = item.addedByParticipantId ?? 'unknown';
      const bucket = byId.get(key);
      if (bucket) {
        bucket.push(item);
      } else {
        byId.set(key, [item]);
      }
    }
    return cart.participants.map((participant) => ({
      participant,
      items: byId.get(participant.id) ?? [],
      isCurrentUser: participant.id === participantId,
    }));
  }, [cart, participantId]);

  const totalItems = useMemo(
    () => cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0,
    [cart],
  );

  const removeItem = useCallback(
    async (item: CartItem) => {
      const result = await commands.removeItem(storeId, item.id);
      if (result.status === 'failed') {
        handleStoreFrontFailure(result);
      }
    },
    [commands, storeId],
  );

  const changeQuantity = useCallback(
    async (item: CartItem, quantity: number) => {
      if (quantity < 1) return;
      const result = await commands.updateItem(storeId, item.id, {
        quantity,
      });
      if (result.status === 'failed') {
        handleStoreFrontFailure(result);
      }
    },
    [commands, storeId],
  );

  const goToMenu = useCallback(() => {
    void navigate(PATHS.STOREFRONT.MENU_BUILD(storeId));
  }, [navigate, storeId]);

  const submit = useCallback(async () => {
    const confirmed = await feedbackCommands.confirm({
      title: tDefault('guest.cart.submitConfirmTitle', 'Submit order?'),
      message: tDefault(
        'guest.cart.submitConfirmMessage',
        'Your order will be sent to the kitchen. You can keep adding items before payment.',
      ),
      confirmLabel: tDefault('guest.cart.submitConfirm', 'Submit'),
    });
    if (!confirmed) return;

    const result = await commands.submit(storeId, {});
    if (result.status === 'submitted') {
      void navigate(PATHS.STOREFRONT.ORDER_BUILD(storeId, result.orderId));
      return;
    }

    if (result.status === 'failed') {
      handleStoreFrontFailure(result);
    }
  }, [commands, navigate, storeId, tDefault]);

  const joinCode = cart?.joinCode ?? null;
  const inviteLink = useMemo(() => {
    if (!joinCode) return null;
    return `${window.location.origin}${PATHS.STOREFRONT.JOIN_BUILD(storeId, joinCode)}`;
  }, [joinCode, storeId]);

  return {
    cart,
    isLoading,
    isMutating,
    participantGroups,
    totalItems,
    removeItem,
    changeQuantity,
    submit,
    goToMenu,
    inviteLink,
    joinCode,
  };
}
