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
import {
  handleStoreFrontFailure,
  handleStorefrontLoadFailure,
} from '../storeFrontFailureFeedback';
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

  // A session-resume failure that blocks the page (store open, no usable
  // session). It lives here, not in a feature store, because it is not part of
  // any store's load triple: the storefront store's {store+menu, isLoading,
  // error} is owned by loadStoreWithMenu, and resumeSession is store-agnostic.
  // So this is page-flow state the VM owns. See runInitialize.
  const [sessionError, setSessionError] = useState<string | null>(null);

  // The page-blocking load error: the store+menu failure (owned by the
  // storefront store) takes precedence, else the open-no-session failure above.
  const error = isActiveStore ? (rawError ?? sessionError) : null;

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
        // The store+menu loaded in parallel; read its fresh open state to
        // decide. When the store is OPEN the menu is only useful with a session
        // (every add needs a scoped token), so a resume failure blocks the page
        // with a retryable load error reported into the storefront store. When
        // CLOSED, ordering is impossible anyway, so leave the menu browseable.
        // A genuinely lost session never lands here — it returns 'ended' and
        // redirects above; 'failed' is only an unreachable server.
        const loadedStore = runtime.stores.storefront.getState().store;
        const open = loadedStore
          ? isStoreOpenNow(loadedStore.businessHours)
          : false;
        if (open) {
          handleStorefrontLoadFailure(session, {
            onRedirect: () => {
              void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId), {
                replace: true,
              });
            },
            onPageError: setSessionError,
          });
        }
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
    [commands, navigate, runtime, storeId],
  );

  useEffect(() => {
    let active = true;
    void runInitialize(() => active);
    return () => {
      active = false;
    };
  }, [runInitialize]);

  // Reactive guard for a live order ending while the guest browses the menu in
  // add-on mode: an SSE update (merchant completes/cancels/marks paid, or the
  // ordering window closes) flips `canAddOn` to false. A finished order has no
  // business on the menu, so mirror the entry-time rule in runInitialize and
  // send the guest to order tracking. runInitialize covers mount; this covers a
  // mid-browse change.
  useEffect(() => {
    if (isActiveStore && order && !order.canAddOn) {
      void navigate(PATHS.STOREFRONT.ORDER_BUILD(storeId, order.id), {
        replace: true,
      });
    }
  }, [isActiveStore, order, navigate, storeId]);

  const retry = useCallback(() => {
    // Clear the prior page-blocking session error so the retry shows progress
    // instead of flashing the stale error while the re-fetch is in flight.
    setSessionError(null);
    void runInitialize();
  }, [runInitialize]);

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

  // Header banners shown independently and stacked. A live pay-later add-on
  // order shows an "adding to #N" indicator. A dine-in group cart (one with a
  // Join Code) keeps the invite prompt available while the order can still be
  // added to — so guests can keep inviting friends after the first round is
  // sent, not only before the first order.
  const addOnBanner = useMemo<{ orderNumber: string } | null>(
    () =>
      order && order.canAddOn ? { orderNumber: order.displayNumber } : null,
    [order],
  );
  const inviteBanner = useMemo<{ joinCode: string } | null>(
    () =>
      cart?.joinCode && (!order || order.canAddOn)
        ? { joinCode: cart.joinCode }
        : null,
    [cart, order],
  );

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

  const goToOrder = useCallback(() => {
    if (order) void navigate(PATHS.STOREFRONT.ORDER_BUILD(storeId, order.id));
  }, [navigate, order, storeId]);

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
    addOnBanner,
    inviteBanner,
    openProduct,
    setOpenProduct,
    addItem,
    goToCart,
    goToInvite,
    goToOrder,
    goBack,
  };
}
