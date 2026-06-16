import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { PATHS } from '@/app/routing/paths';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';
import type { AddCartItemRequest } from '@/models/cart';
import {
  buildModifierMap,
  groupMenuByCategory,
  isStoreOpenNow,
} from '@/models/storeFrontMenu';
import type { PublicProduct } from '@/models/storeFrontMenu';
import { useStoreFrontStoreId } from '../useStoreFrontStoreId';
import { createMenuPageCommands } from './menuPage.commands';

export function useMenuPageVM() {
  const storeId = useStoreFrontStoreId();
  const navigate = useNavigate();
  const runtime = getStoreFrontRuntime();
  const commands = useMemo(() => createMenuPageCommands(runtime), [runtime]);

  const activeStoreId = useStore(
    runtime.stores.tenant,
    (state) => state.activeStoreId,
  );
  const isActiveStore = activeStoreId === storeId;
  const rawStore = useStore(runtime.stores.storefront, (state) => state.store);
  const rawMenu = useStore(runtime.stores.storefront, (state) => state.menu);
  const rawIsLoading = useStore(
    runtime.stores.storefront,
    (state) => state.isLoading,
  );
  const rawCart = useStore(runtime.stores.cart, (state) => state.cart);
  const rawIsMutating = useStore(
    runtime.stores.cart,
    (state) => state.isMutating,
  );
  const store = isActiveStore ? rawStore : null;
  const menu = isActiveStore ? rawMenu : null;
  const cart = isActiveStore ? rawCart : null;
  const isLoading = !isActiveStore || rawIsLoading;
  const isMutating = isActiveStore && rawIsMutating;

  const [openProductState, setOpenProductState] = useState<{
    product: PublicProduct;
    storeId: string;
  } | null>(null);
  const openProduct =
    isActiveStore && openProductState?.storeId === storeId
      ? openProductState.product
      : null;
  const setOpenProduct = useCallback(
    (product: PublicProduct | null) => {
      setOpenProductState(product ? { product, storeId } : null);
    },
    [storeId],
  );

  useEffect(() => {
    if (!storeId) return;

    let active = true;
    async function init() {
      const result = await commands.initialize(storeId);
      if (active && result.session.status === 'none') {
        void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId), { replace: true });
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [commands, navigate, storeId]);

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
      const result = await commands.addItem(storeId, request);

      if (result.status === 'updated') {
        setOpenProduct(null);
        return;
      }

      if (result.message) {
        feedbackCommands.toast({ tone: 'error', message: result.message });
      }
    },
    [commands, setOpenProduct, storeId],
  );

  const goToCart = useCallback(() => {
    void navigate(PATHS.STOREFRONT.CART_BUILD(storeId));
  }, [navigate, storeId]);

  const goToInvite = useCallback(() => {
    void navigate(PATHS.STOREFRONT.INVITE_BUILD(storeId));
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
    goToInvite,
  };
}
