import { tDefault } from '@/app/i18n';
import type { StoreFrontRuntime } from '@/features/storeFront/runtime';
import type { StoreFrontCommandFailure } from '@/services/utils/storeFrontApiError';

export type InviteInitResult =
  /** The group session is open and a Join Code is available; share it. */
  | { status: 'invitable' }
  /** Pre-order with no group cart (takeaway / no session): redirect to landing. */
  | { status: 'unavailable' }
  /** A placed order can no longer be added to: redirect to order tracking. */
  | { status: 'closed' }
  /**
   * A transient load failure, OR an addable order whose reusable cart did not
   * hydrate its Join Code: surface a retryable page error and stay put.
   */
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

      const { cart } = runtime.stores.cart.getState();
      const { order } = runtime.stores.order.getState();

      // After the first order, the order's `canAddOn` is the authority on whether
      // the group session is still open: payment, completion, cancellation, and
      // the ordering deadline all close it. A closed order has nothing to share —
      // send the host to order tracking (even if a stale Join Code lingers on the
      // reusable cart).
      if (order && !order.canAddOn) {
        return { status: 'closed' };
      }

      // A Join Code identifies a usable dine-in group session (takeaway carts
      // carry none): shareable both before the first order and during add-on.
      if (cart?.joinCode) {
        return { status: 'invitable' };
      }

      // No code: for an addable order this is an inconsistent/transient load (the
      // reusable cart did not hydrate) — a retryable page error, not a dead end.
      // Before any order it means a non-group (takeaway) or absent session.
      if (order) {
        return {
          status: 'failed',
          reason: 'unknown',
          message: tDefault(
            'common.errors.tryAgainLater',
            'Try again in a moment.',
          ),
        };
      }
      return { status: 'unavailable' };
    },

    // Record a primary-load failure into the cart store so the page renders its
    // load-error view (the VM owns the page-vs-redirect-vs-silent decision).
    reportLoadFailure(message: string) {
      runtime.commands.cart.reportLoadFailure(message);
    },
  };
}
