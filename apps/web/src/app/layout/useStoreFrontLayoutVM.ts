import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router';
import { useStore } from 'zustand';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';
import type { PublicStore } from '@/models/storeFrontMenu';

/**
 * Layout-level VM hook for the storefront shell. It owns two shell concerns on
 * behalf of `StoreFrontLayout`:
 *
 * 1. The guest SSE session stream, connected once for the whole storefront and
 *    shared across menu/cart/order navigation. Keyed on `guestToken` so a new
 *    session reconnects and cleanup disconnects on unmount or token change.
 *    No-ops cleanly when no active session is present.
 * 2. The store record that backs the persistent header (logo + name). Loading
 *    it here means the header shows the store's branding immediately on a hard
 *    refresh, before the lazy page chunk has even loaded, and keeps it stable
 *    across page navigation.
 *
 * Views must not call commands or stores directly; this hook owns that on
 * behalf of the layout.
 */
export function useStoreFrontLayoutVM(): { store: PublicStore | null } {
  const runtime = getStoreFrontRuntime();
  const { storeId } = useParams<{ storeId: string }>();

  const guestToken = useStore(
    runtime.stores.session,
    (state) => state.guestToken,
  );
  const sessionStoreId = useStore(
    runtime.stores.session,
    (state) => state.storeId,
  );
  const activeStoreId = useStore(
    runtime.stores.tenant,
    (state) => state.activeStoreId,
  );
  const rawStore = useStore(runtime.stores.storefront, (state) => state.store);

  // Stable reference to the storefront/tenant command factories.
  const storeCommands = useMemo(
    () => ({
      tenant: runtime.commands.tenant,
      storefront: runtime.commands.storefront,
    }),
    [runtime],
  );

  // Activate the routed store and load its record for the header. `activateStore`
  // is idempotent for the same store, so this no-ops once a page has already
  // activated it (the guard also protects a page-restored session from being
  // cleared). `loadStore` fetches only the store, not the menu.
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    void (async () => {
      await storeCommands.tenant.activateStore(storeId);
      if (cancelled) return;
      await storeCommands.storefront.loadStore(storeId);
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId, storeCommands]);

  // Only surface the store when it matches the routed store, mirroring the page
  // VMs so stale branding never leaks across a store switch.
  const store = storeId && activeStoreId === storeId ? rawStore : null;

  // Stable reference to the command factory output; re-memoised only when the
  // runtime instance changes (the runtime is a singleton, so this is stable).
  const sessionStreamCommands = useMemo(
    () => runtime.commands.sessionStream,
    [runtime],
  );

  // Connect once when there is an active scoped session. The stream command
  // already guards on `tenant.activeStoreId === storeId && session.storeId ===
  // storeId`, so passing `sessionStoreId` satisfies those guards when a session
  // is active and lets the command no-op when it is not.
  useEffect(() => {
    // No session or stores don't match: nothing to stream.
    if (!guestToken || !sessionStoreId || activeStoreId !== sessionStoreId) {
      return;
    }
    const disconnect =
      sessionStreamCommands.connectSessionStream(sessionStoreId);
    return disconnect;
  }, [guestToken, sessionStoreId, activeStoreId, sessionStreamCommands]);

  return { store };
}
