import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { PATHS } from '@/app/routing/paths';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';
import type { AddCartItemRequest } from '@/models/cart';
import { canGuestAddOn } from '@/models/order';
import { isStoreOpenNow } from '@/models/store';
import {
  buildAllergenMap,
  buildModifierMap,
  buildTagMap,
  groupMenuByCategory,
} from '@/models/storeFrontMenu';
import type { PublicProduct } from '@/models/storeFrontMenu';
import { useStoreFrontStoreId } from '../useStoreFrontStoreId';
import { handleStoreFrontFailure } from '../storeFrontFailureFeedback';
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
  const rawOrder = useStore(runtime.stores.order, (state) => state.order);
  const rawIsMutating = useStore(
    runtime.stores.cart,
    (state) => state.isMutating,
  );
  const store = isActiveStore ? rawStore : null;
  const menu = isActiveStore ? rawMenu : null;
  const cart = isActiveStore ? rawCart : null;
  const order = isActiveStore ? rawOrder : null;
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
      const { session } = await commands.initialize(storeId);
      if (!active) return;

      if (session.status === 'none' || session.status === 'ended') {
        void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId), {
          replace: true,
        });
        return;
      }

      if (session.status === 'failed') {
        // A benign race: the active store changed while the resume was in
        // flight. The isActiveStore guard already nulls this page's data and
        // another navigation is taking over, so there is nothing to do.
        if (session.reason === 'session-store-mismatch') return;
        // A transient failure (network/server). The stored session is left
        // intact, so surface the error and stay put — the guest can keep
        // browsing and retry (reload, and later SSE will resync).
        handleStoreFrontFailure(session);
        return;
      }

      // A placed order that can no longer be added to (pay-first, finished)
      // has no business on the menu — send it to order tracking.
      if (session.status === 'order' && !session.canAddOn) {
        void navigate(PATHS.STOREFRONT.ORDER_BUILD(storeId, session.orderId), {
          replace: true,
        });
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

  // Tabs and their stable keys, mirroring the section keys the view renders.
  // The view feeds these keys to useScrollSpyTabs for scroll behavior.
  const categoryTabs = useMemo(
    () =>
      categoryGroups.map((group) => ({
        key: group.category?.id ?? 'uncategorized',
        category: group.category,
      })),
    [categoryGroups],
  );
  const modifierMap = useMemo(
    () => (menu ? buildModifierMap(menu.modifiers) : new Map()),
    [menu],
  );
  const tagMap = useMemo(
    () => (menu ? buildTagMap(menu.tags ?? []) : new Map()),
    [menu],
  );
  const allergenMap = useMemo(
    () => (menu ? buildAllergenMap(menu.allergens ?? []) : new Map()),
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

  // Header banner: adding on to a live pay-later order takes priority; with no
  // order, a dine-in group cart (one with a Join Code) shows the invite prompt.
  const orderBanner = useMemo<
    | { mode: 'adding'; orderNumber: string }
    | { mode: 'invite' }
    | { mode: 'none' }
  >(() => {
    if (order && canGuestAddOn(order)) {
      return { mode: 'adding', orderNumber: order.displayNumber };
    }
    if (!order && cart?.joinCode) {
      return { mode: 'invite' };
    }
    return { mode: 'none' };
  }, [cart, order]);

  const addItem = useCallback(
    async (request: AddCartItemRequest) => {
      const result = await commands.addItem(storeId, request);

      if (result.status === 'updated') {
        setOpenProduct(null);
        return;
      }

      handleStoreFrontFailure(result);
    },
    [commands, setOpenProduct, storeId],
  );

  const goToCart = useCallback(() => {
    void navigate(PATHS.STOREFRONT.CART_BUILD(storeId));
  }, [navigate, storeId]);

  const goToInvite = useCallback(() => {
    void navigate(PATHS.STOREFRONT.INVITE_BUILD(storeId));
  }, [navigate, storeId]);

  const goToLanding = useCallback(() => {
    void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId));
  }, [navigate, storeId]);

  return {
    store,
    isLoading,
    isOpen,
    categoryGroups,
    categoryTabs,
    modifierMap,
    tagMap,
    allergenMap,
    cartItemCount,
    cartTotal: cart?.totalAmount ?? 0,
    isMutating,
    orderBanner,
    openProduct,
    setOpenProduct,
    addItem,
    goToCart,
    goToInvite,
    goToLanding,
  };
}
