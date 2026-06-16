import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { tDefault } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';
import { useCopyToClipboard } from '@/shared/hooks/useCopyToClipboard';
import { useStoreFrontStoreId } from '../useStoreFrontStoreId';
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
  const store = isActiveStore ? rawStore : null;
  const joinCode = isActiveStore ? (rawCart?.joinCode ?? null) : null;

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

  useEffect(() => {
    if (!storeId) return;

    let active = true;
    async function init() {
      const result = await commands.initialize(storeId);
      if (!active || result.status === 'invitable') return;

      await feedbackCommands.alert({
        title: tDefault('guest.invite.unavailableTitle', 'Invite unavailable'),
        message: tDefault(
          'guest.invite.unavailableMessage',
          'This group order can no longer be shared.',
        ),
        confirmLabel: tDefault('common.ok', 'OK'),
      });
      if (active) {
        void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId), {
          replace: true,
        });
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [commands, navigate, storeId]);

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
    copyJoinCode,
    copyInviteLink,
    goToMenu,
  };
}
