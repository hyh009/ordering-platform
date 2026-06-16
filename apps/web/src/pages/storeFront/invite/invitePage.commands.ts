import type { StoreFrontRuntime } from '@/features/storeFront/runtime';

export type InviteInitResult =
  /** An active cart still carries a usable Join Code; the invite can be shared. */
  | { status: 'invitable' }
  /** No shareable Join Code: ended, checked out, takeaway, or no session. */
  | { status: 'unavailable' };

export function createInvitePageCommands(runtime: StoreFrontRuntime) {
  return {
    async initialize(storeId: string): Promise<InviteInitResult> {
      await runtime.commands.tenant.activateStore(storeId);
      await runtime.commands.storefront.loadStore(storeId);

      // `activateStore` clears the cart when switching stores, so any cart left
      // in the shared store already belongs to this store. Reuse it when we
      // arrived from another storefront page; only hit the backend when nothing
      // is loaded yet (a direct invite link or a refresh).
      if (!runtime.stores.cart.getState().cart) {
        await runtime.commands.session.resumeSession(storeId);
      }

      // Only an active cart that still exposes its Join Code can be shared. The
      // backend gates whether the code is returned; the frontend never invents
      // availability.
      const { cart } = runtime.stores.cart.getState();
      return cart?.joinCode ? { status: 'invitable' } : { status: 'unavailable' };
    },
  };
}
