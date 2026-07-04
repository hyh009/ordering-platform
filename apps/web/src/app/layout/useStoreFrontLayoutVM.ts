import { useEffect, useMemo } from 'react';
import { useStore } from 'zustand';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';

/**
 * Layout-level VM hook for the storefront shell. Connects the guest SSE
 * session stream once for the whole storefront, shared across menu/cart/order
 * navigation. Keyed on `guestToken` so a new session reconnects and cleanup
 * disconnects on unmount or token change. No-ops cleanly when no active session
 * is present (landing, join, other session-less routes).
 *
 * Views must not call commands or stores directly; this hook owns the
 * connection lifecycle on behalf of `StoreFrontLayout`.
 */
export function useStoreFrontLayoutVM() {
  const runtime = getStoreFrontRuntime();

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
}
