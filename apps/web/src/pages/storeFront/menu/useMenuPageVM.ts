import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { PATHS } from '@/app/routing/paths';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';
import type { AddCartItemRequest } from '@/models/cart';
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
  const rawError = useStore(runtime.stores.storefront, (state) => state.error);
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
  // The store+menu load failure (network/server). Captured by loadStoreWithMenu
  // into the storefront store; the view renders the page error when there is no
  // menu to show. Session-resume failures stay a toast (see runInitialize).
  const error = isActiveStore ? rawError : null;

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

  // Loads the store+menu and resumes the session, then reacts to the session
  // outcome (navigate or toast). The store+menu load failure is left in the
  // storefront store's `error` for the view to render; `isActive` guards
  // navigation against an unmount mid-flight.
  const runInitialize = useCallback(
    async (isActive: () => boolean = () => true) => {
      if (!storeId) return;

      const { session } = await commands.initialize(storeId);
      if (!isActive()) return;

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
    },
    [commands, navigate, storeId],
  );

  useEffect(() => {
    let active = true;
    void runInitialize(() => active);
    return () => {
      active = false;
    };
  }, [runInitialize]);

  const retry = useCallback(() => {
    void runInitialize();
  }, [runInitialize]);

  // Stream live cart/order updates while browsing the menu so the cart bar and
  // add-on banner reflect a teammate's changes without a refresh. Keyed on the
  // token so a new session reconnects; cleanup disconnects on unmount.
  const guestToken = useStore(
    runtime.stores.session,
    (state) => state.guestToken,
  );
  useEffect(() => {
    if (!isActiveStore || !guestToken) return;
    const disconnect = commands.connectSessionStream(storeId);
    return disconnect;
  }, [commands, storeId, isActiveStore, guestToken]);

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
    | { mode: 'invite'; joinCode: string }
    | { mode: 'none' }
  >(() => {
    if (order && order.canAddOn) {
      return { mode: 'adding', orderNumber: order.displayNumber };
    }
    if (!order && cart?.joinCode) {
      return { mode: 'invite', joinCode: cart.joinCode };
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

  // Back goes to the order being added to during add-on mode (the menu is then a
  // sub-flow of that order), otherwise to the landing chooser.
  const goBack = useCallback(() => {
    if (order && order.canAddOn) {
      void navigate(PATHS.STOREFRONT.ORDER_BUILD(storeId, order.id));
      return;
    }
    void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId));
  }, [navigate, order, storeId]);

  return {
    store,
    isLoading,
    error,
    retry,
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
    goBack,
  };
}
