import type { StoreFrontRuntime } from '@/features/storeFront/runtime';
import type { StoreFrontCommandFailure } from '@/services/utils/storeFrontApiError';

export type InviteInitResult =
  /** An active cart still carries a usable Join Code; the invite can be shared. */
  | { status: 'invitable' }
  /** No shareable Join Code: ended, checked out, takeaway, or no session. */
  | { status: 'unavailable' }
  /** A transient load failure (network/server); the VM surfaces it and stays put. */
  | StoreFrontCommandFailure;

export function createInvitePageCommands(runtime: StoreFrontRuntime) {
  return {
    async initialize(storeId: string): Promise<InviteInitResult> {
      await runtime.commands.tenant.activateStore(storeId);
      // The invite's primary resource is the cart's Join Code, so it shares the
      // cart store. Start the load lifecycle there: clears any prior load error
      // and shows loading, so a retry does not flash the stale error.
      runtime.commands.cart.markLoadStarted();

      const store = await runtime.commands.storefront.loadStore(storeId);
      if (store.status === 'failed') return store;

      // `activateStore` clears the cart when switching stores, so any cart left
      // in the shared store already belongs to this store. Reuse it when we
      // arrived from another storefront page; only hit the backend when nothing
      // is loaded yet (a direct invite link or a refresh).
      if (!runtime.stores.cart.getState().cart) {
        const session = await runtime.commands.session.resumeSession(storeId);
        if (session.status === 'failed') return session;
      }

      // Only an active cart that still exposes its Join Code can be shared. The
      // backend gates whether the code is returned; the frontend never invents
      // availability.
      const { cart } = runtime.stores.cart.getState();
      return cart?.joinCode
        ? { status: 'invitable' }
        : { status: 'unavailable' };
    },

    // Record a primary-load failure into the cart store so the page renders its
    // load-error view (the VM owns the page-vs-redirect-vs-silent decision).
    reportLoadFailure(message: string) {
      runtime.commands.cart.reportLoadFailure(message);
    },
  };
}
