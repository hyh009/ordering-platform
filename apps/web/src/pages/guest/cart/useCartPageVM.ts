import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { useAppTranslation } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import { getGuestRuntime } from '@/features/guest/runtime';
import type { CartItem } from '@/models/cart';
import { useGuestStoreId } from '../useGuestStoreId';

export function useCartPageVM() {
  const storeId = useGuestStoreId();
  const navigate = useNavigate();
  const { tDefault } = useAppTranslation();
  const runtime = useMemo(() => getGuestRuntime(), []);

  const cart = useStore(runtime.stores.cart, (state) => state.cart);
  const isLoading = useStore(runtime.stores.cart, (state) => state.isLoading);
  const isMutating = useStore(runtime.stores.cart, (state) => state.isMutating);
  const participantId = useStore(
    runtime.stores.session,
    (state) => state.participantId,
  );
  const guestToken = useStore(
    runtime.stores.session,
    (state) => state.guestToken,
  );

  useEffect(() => {
    if (!guestToken) {
      void navigate(PATHS.GUEST.LANDING_BUILD(storeId), { replace: true });
      return;
    }
    void runtime.commands.cart.loadCart();
  }, [guestToken, navigate, runtime, storeId]);

  const isOwnItem = useCallback(
    (item: CartItem) => item.addedByParticipantId === participantId,
    [participantId],
  );

  const removeItem = useCallback(
    async (item: CartItem) => {
      const result = await runtime.commands.cart.removeItem(item.id);
      if (result.status === 'failed') {
        feedbackCommands.toast({ tone: 'error', message: result.message });
      }
    },
    [runtime],
  );

  const changeQuantity = useCallback(
    async (item: CartItem, quantity: number) => {
      if (quantity < 1) return;
      const result = await runtime.commands.cart.updateItem(item.id, {
        quantity,
      });
      if (result.status === 'failed') {
        feedbackCommands.toast({ tone: 'error', message: result.message });
      }
    },
    [runtime],
  );

  const goToMenu = useCallback(() => {
    void navigate(PATHS.GUEST.MENU_BUILD(storeId));
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

    const result = await runtime.commands.cart.submitCart({});
    if (result.status === 'submitted') {
      void navigate(PATHS.GUEST.ORDER_BUILD(storeId, result.orderId));
      return;
    }

    feedbackCommands.toast({ tone: 'error', message: result.message });
  }, [navigate, runtime, storeId, tDefault]);

  const joinCode = cart?.joinCode ?? null;
  const inviteLink = useMemo(() => {
    if (!joinCode) return null;
    return `${window.location.origin}${PATHS.GUEST.JOIN_BUILD(storeId, joinCode)}`;
  }, [joinCode, storeId]);

  return {
    cart,
    isLoading,
    isMutating,
    isOwnItem,
    removeItem,
    changeQuantity,
    submit,
    goToMenu,
    inviteLink,
    joinCode,
  };
}
