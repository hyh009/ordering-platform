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
      const [, session] = await Promise.all([
        runtime.commands.storefront.loadStore(storeId),
        runtime.commands.session.resumeSession(storeId),
      ]);

      // Only an active cart that still exposes its Join Code can be shared. The
      // backend gates whether the code is returned; the frontend never invents
      // availability.
      if (session.status === 'cart') {
        const { cart } = runtime.stores.cart.getState();
        if (cart?.joinCode) return { status: 'invitable' };
      }

      return { status: 'unavailable' };
    },
  };
}
