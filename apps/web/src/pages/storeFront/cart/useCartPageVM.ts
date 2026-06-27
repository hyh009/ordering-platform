import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { useAppTranslation } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';
import type { CartItem, OrderingParticipant } from '@/models/cart';
import { useStoreFrontStoreId } from '../useStoreFrontStoreId';
import {
  handleStoreFrontFailure,
  handleStorefrontLoadFailure,
} from '../storeFrontFailureFeedback';
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
  const rawOrder = useStore(runtime.stores.order, (state) => state.order);
  const rawLoadError = useStore(runtime.stores.cart, (state) => state.error);
  const cart = isActiveStore ? rawCart : null;
  const isLoading = !isActiveStore || rawIsLoading;
  const isMutating = isActiveStore && rawIsMutating;
  const participantId = isActiveStore ? rawParticipantId : null;
  // The already-submitted order that this draft cart is adding on to. Surfaced
  // as a banner/link so the round's earlier items and total are not hidden.
  const submittedOrder = isActiveStore ? rawOrder : null;
  // The cart's primary-load error lives in the cart store (only this page reads
  // it), so the page renders its load-error view from store state.
  const loadError = isActiveStore ? rawLoadError : null;

  // The page's primary-resource load, applied to navigation and load-error
  // state. Shared by the entry effect and retry so both run the exact same
  // flow. `isActive` lets the effect ignore a stale resolution after unmount;
  // retry passes a constant-true gate. The leading await keeps every setState
  // off the synchronous effect path.
  const runInitialize = useCallback(
    async (isActive: () => boolean) => {
      const result = await commands.initialize(storeId);
      if (!isActive()) return;
      if (result.status === 'none') {
        void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId), {
          replace: true,
        });
        return;
      }
      if (result.status === 'failed') {
        // Surface a primary-load failure with the load axis, not a toast over a
        // blank page. The command already maps expired/ended sessions to
        // 'none', so a redirect here just needs to send the user to landing.
        // resumeSession is store-agnostic, so the 'page' case reports into the
        // cart store explicitly.
        handleStorefrontLoadFailure(result, {
          onRedirect: () => {
            void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId), {
              replace: true,
            });
          },
          onPageError: commands.reportLoadFailure,
        });
        return;
      }
      // The cart is terminal but an order exists: send the participant to order
      // tracking instead of dead-ending on the cart.
      if (result.status === 'order') {
        void navigate(PATHS.STOREFRONT.ORDER_BUILD(storeId, result.orderId), {
          replace: true,
        });
      }
    },
    [commands, navigate, storeId],
  );

  useEffect(() => {
    let active = true;
    async function init() {
      await runInitialize(() => active);
    }
    void init();
    return () => {
      active = false;
    };
  }, [runInitialize]);

  const retry = useCallback(() => {
    void runInitialize(() => true);
  }, [runInitialize]);

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

  const goToOrder = useCallback(() => {
    if (!submittedOrder) return;
    void navigate(PATHS.STOREFRONT.ORDER_BUILD(storeId, submittedOrder.id));
  }, [navigate, storeId, submittedOrder]);

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
    loadError,
    retry,
    isMutating,
    participantGroups,
    totalItems,
    removeItem,
    changeQuantity,
    submit,
    goToMenu,
    goToOrder,
    submittedOrder,
    inviteLink,
    joinCode,
  };
}
