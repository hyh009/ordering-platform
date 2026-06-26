import type { StoreFrontRuntime } from '@/features/storeFront/runtime';
import type { SubmitCartRequest, UpdateCartItemRequest } from '@/models/cart';

export function createCartPageCommands(runtime: StoreFrontRuntime) {
  return {
    async initialize(storeId: string) {
      await runtime.commands.tenant.activateStore(storeId);
      // Start the cart's load lifecycle in the store: clears any prior load
      // error and shows loading, so a retry does not flash the stale error.
      runtime.commands.cart.markLoadStarted();
      // Resolve the combined session in one request: it hydrates the live draft
      // cart AND any submitted order. The cart page needs the order so it can
      // surface a link back to it during an add-on round, not just the cart.
      const resumed = await runtime.commands.session.resumeSession(storeId);

      switch (resumed.status) {
        case 'cart':
          // Live draft cart, no order yet (first round).
          return { status: 'loaded' as const };
        case 'order': {
          // A submitted order exists. When a live draft cart still coexists
          // (add-on round), stay on the cart so the participant can keep adding
          // and see the order via a banner. Only when no live cart remains do we
          // hand off to order tracking, to avoid dead-ending on an empty cart.
          const hasLiveCart =
            runtime.stores.cart.getState().cart?.status === 'active';
          return hasLiveCart
            ? { status: 'loaded' as const }
            : { status: 'order' as const, orderId: resumed.orderId };
        }
        case 'none':
        case 'ended':
          // Nothing usable to show here (no session, or it has ended/expired):
          // send the participant back to the start.
          return { status: 'none' as const };
        case 'failed':
          // A transient failure (network/server) or a benign store-mismatch
          // race. Hand the typed failure to the VM so it can surface feedback
          // and stay put, instead of masquerading a blip as a gone session and
          // bouncing to landing.
          return resumed;
      }
    },

    removeItem(storeId: string, itemId: string) {
      return runtime.commands.cart.removeItem(storeId, itemId);
    },

    updateItem(
      storeId: string,
      itemId: string,
      request: UpdateCartItemRequest,
    ) {
      return runtime.commands.cart.updateItem(storeId, itemId, request);
    },

    submit(storeId: string, request: SubmitCartRequest) {
      return runtime.commands.cart.submitCart(storeId, request);
    },

    // Open the live session stream so cart/order changes from other devices
    // land in the shared stores without a refresh. Returns a disposer.
    connectSessionStream(storeId: string) {
      return runtime.commands.sessionStream.connectSessionStream(storeId);
    },

    // Record a primary-load failure into the cart store so the page renders its
    // load-error view (the VM owns the page-vs-redirect-vs-silent decision).
    reportLoadFailure(message: string) {
      runtime.commands.cart.reportLoadFailure(message);
    },
  };
}
