import type { StoreFrontRuntime } from '@/features/storeFront/runtime';
import type {
  AddCartItemRequest,
  SubmitCartRequest,
  UpdateCartItemRequest,
} from '@/models/cart';

export function createMenuPageCommands(runtime: StoreFrontRuntime) {
  return {
    async initialize(storeId: string) {
      await runtime.commands.tenant.activateStore(storeId);
      const [storefront, session] = await Promise.all([
        runtime.commands.storefront.loadStoreWithMenu(storeId),
        // Resume over the network so the menu reflects the live cart/order
        // (e.g. the pay-later add-on banner) even on a hard refresh. Ongoing
        // freshness will come from SSE later.
        runtime.commands.session.resumeSession(storeId),
      ]);
      return { storefront, session };
    },

    addItem(storeId: string, request: AddCartItemRequest) {
      return runtime.commands.cart.addItem(storeId, request);
    },

    updateCartItem(
      storeId: string,
      itemId: string,
      request: UpdateCartItemRequest,
    ) {
      return runtime.commands.cart.updateItem(storeId, itemId, request);
    },

    // The option picker for a cart item needs the product's choices. The menu
    // is usually in the store already; this loads it when a page was opened
    // without it.
    async ensureMenuLoaded(storeId: string) {
      if (runtime.stores.storefront.getState().menu) {
        return { status: 'loaded' as const };
      }
      return runtime.commands.storefront.loadStoreWithMenu(storeId);
    },

    removeCartItem(storeId: string, itemId: string) {
      return runtime.commands.cart.removeItem(storeId, itemId);
    },

    submitCart(storeId: string, request: SubmitCartRequest) {
      return runtime.commands.cart.submitCart(storeId, request);
    },

    sendAssistantMessage(
      storeId: string,
      input: {
        message: string;
        responseToPromptId?: string;
        selectedOptionId?: string;
      },
    ) {
      return runtime.commands.aiOrdering.sendMessage(storeId, input);
    },

    loadAssistantConversation(storeId: string) {
      return runtime.commands.aiOrdering.loadConversation(storeId);
    },

    applyAssistantProposal(storeId: string) {
      return runtime.commands.aiOrdering.applyProposal(storeId);
    },

    dismissAssistantOperation(operationId: string) {
      runtime.commands.aiOrdering.dismissOperation(operationId);
    },

    answerAssistantProposalChoice(input: {
      operationId: string;
      modifierId: string;
      optionIds: string[];
    }) {
      runtime.commands.aiOrdering.answerProposalChoice(input);
    },
  };
}
