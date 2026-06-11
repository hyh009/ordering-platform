import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { PATHS } from '@/app/routing/paths';
import { getGuestRuntime } from '@/features/guest/runtime';
import type { AddCartItemRequest } from '@/models/cart';
import {
  buildModifierMap,
  groupMenuByCategory,
  isStoreOpenNow,
} from '@/models/guestMenu';
import type { PublicProduct } from '@/models/guestMenu';
import { useGuestStoreId } from '../useGuestStoreId';

export function useMenuPageVM() {
  const storeId = useGuestStoreId();
  const navigate = useNavigate();
  const runtime = useMemo(() => getGuestRuntime(), []);

  const store = useStore(runtime.stores.storefront, (state) => state.store);
  const menu = useStore(runtime.stores.storefront, (state) => state.menu);
  const isLoading = useStore(
    runtime.stores.storefront,
    (state) => state.isLoading,
  );
  const cart = useStore(runtime.stores.cart, (state) => state.cart);
  const isMutating = useStore(runtime.stores.cart, (state) => state.isMutating);
  const guestToken = useStore(
    runtime.stores.session,
    (state) => state.guestToken,
  );

  const [openProduct, setOpenProduct] = useState<PublicProduct | null>(null);

  // Reaching the menu without a session means the cart was never created;
  // send the guest back to the landing chooser.
  useEffect(() => {
    if (!guestToken) {
      void navigate(PATHS.GUEST.LANDING_BUILD(storeId), { replace: true });
    }
  }, [guestToken, navigate, storeId]);

  useEffect(() => {
    if (!storeId) return;
    if (!menu) {
      void runtime.commands.storefront.loadStorefront(storeId);
    }
  }, [menu, runtime, storeId]);

  const categoryGroups = useMemo(
    () => (menu ? groupMenuByCategory(menu) : []),
    [menu],
  );
  const modifierMap = useMemo(
    () => (menu ? buildModifierMap(menu.modifiers) : new Map()),
    [menu],
  );

  const isOpen = useMemo(
    () => (store ? isStoreOpenNow(store.businessHours) : false),
    [store],
  );

  const cartItemCount = useMemo(
    () => cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    [cart],
  );

  const addItem = useCallback(
    async (request: AddCartItemRequest) => {
      const result = await runtime.commands.cart.addItem(request);

      if (result.status === 'updated') {
        setOpenProduct(null);
        return;
      }

      feedbackCommands.toast({ tone: 'error', message: result.message });
    },
    [runtime],
  );

  const goToCart = useCallback(() => {
    void navigate(PATHS.GUEST.CART_BUILD(storeId));
  }, [navigate, storeId]);

  return {
    store,
    isLoading,
    isOpen,
    categoryGroups,
    modifierMap,
    cartItemCount,
    cartTotal: cart?.totalAmount ?? 0,
    isMutating,
    openProduct,
    setOpenProduct,
    addItem,
    goToCart,
  };
}
