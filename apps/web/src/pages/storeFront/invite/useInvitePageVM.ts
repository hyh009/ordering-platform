import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { PATHS } from '@/app/routing/paths';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';
import { useCopyToClipboard } from '@/shared/hooks/useCopyToClipboard';
import { useStoreFrontStoreId } from '../useStoreFrontStoreId';
import { handleStorefrontLoadFailure } from '../storeFrontFailureFeedback';
import { createInvitePageCommands } from './invitePage.commands';

export function useInvitePageVM() {
  const storeId = useStoreFrontStoreId();
  const navigate = useNavigate();
  const runtime = getStoreFrontRuntime();
  const commands = useMemo(() => createInvitePageCommands(runtime), [runtime]);

  const activeStoreId = useStore(
    runtime.stores.tenant,
    (state) => state.activeStoreId,
  );
  const isActiveStore = activeStoreId === storeId;
  const rawStore = useStore(runtime.stores.storefront, (state) => state.store);
  const rawCart = useStore(runtime.stores.cart, (state) => state.cart);
  const rawError = useStore(runtime.stores.cart, (state) => state.error);
  const rawOrder = useStore(runtime.stores.order, (state) => state.order);
  const store = isActiveStore ? rawStore : null;
  const order = isActiveStore ? rawOrder : null;
  const joinCode = isActiveStore ? (rawCart?.joinCode ?? null) : null;
  // The invite's primary resource is the cart's Join Code, so its load error
  // lives in the cart store (same source as the cart page).
  const error = isActiveStore ? rawError : null;

  // The invite link intentionally carries only the public Join Code route. No
  // guest token, cart, order, participant, name, avatar, or table number.
  const inviteLink = useMemo(() => {
    if (!storeId || !joinCode) return '';
    return new URL(
      PATHS.STOREFRONT.JOIN_BUILD(storeId, joinCode),
      window.location.origin,
    ).toString();
  }, [joinCode, storeId]);

  const { copied: codeCopied, copy: copyCode } = useCopyToClipboard();
  const { copied: linkCopied, copy: copyLink } = useCopyToClipboard();

  // The page's primary load, shared by the entry effect and retry. A transient
  // failure surfaces on the load axis (page error + retry) and stays put; only a
  // genuine "unavailable" session bounces to landing. `isActive` lets the effect
  // ignore a stale resolution after unmount.
  const runInitialize = useCallback(
    async (isActive: () => boolean) => {
      const result = await commands.initialize(storeId);
      if (!isActive()) return;

      if (result.status === 'invitable') return;

      if (result.status === 'closed') {
        // The placed order can no longer be added to; order tracking is the
        // useful destination (the reactive guard below covers a mid-view close).
        const closedOrder = runtime.stores.order.getState().order;
        if (closedOrder) {
          void navigate(PATHS.STOREFRONT.ORDER_BUILD(storeId, closedOrder.id), {
            replace: true,
          });
        }
        return;
      }

      if (result.status === 'failed') {
        // resumeSession is store-agnostic, so the 'page' case reports into the
        // cart store (the invite's primary resource) explicitly.
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

      // status === 'unavailable': no usable group session is available for this
      // route, so mirror Menu/Cart and return to the store entry.
      void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId), {
        replace: true,
      });
    },
    [commands, navigate, runtime, storeId],
  );

  useEffect(() => {
    if (!storeId) return;

    let active = true;
    void runInitialize(() => active);
    return () => {
      active = false;
    };
  }, [storeId, runInitialize]);

  // A live order can close while the host sits on the invite page (SSE: payment,
  // completion, cancellation, or the ordering deadline). Mirror the entry rule
  // and send them to order tracking. runInitialize covers entry; this covers a
  // mid-view change.
  useEffect(() => {
    if (order && !order.canAddOn) {
      void navigate(PATHS.STOREFRONT.ORDER_BUILD(storeId, order.id), {
        replace: true,
      });
    }
  }, [order, navigate, storeId]);

  const retry = useCallback(() => {
    void runInitialize(() => true);
  }, [runInitialize]);

  const copyJoinCode = useCallback(() => {
    void copyCode(joinCode ?? '');
  }, [copyCode, joinCode]);

  const copyInviteLink = useCallback(() => {
    void copyLink(inviteLink);
  }, [copyLink, inviteLink]);

  const goToMenu = useCallback(() => {
    void navigate(PATHS.STOREFRONT.MENU_BUILD(storeId));
  }, [navigate, storeId]);

  return {
    store,
    joinCode,
    inviteLink,
    codeCopied,
    linkCopied,
    error,
    retry,
    copyJoinCode,
    copyInviteLink,
    goToMenu,
  };
}
