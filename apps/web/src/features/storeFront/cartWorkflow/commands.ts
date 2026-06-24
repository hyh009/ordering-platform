import type { GuestSessionCommands } from '@/app/global/guestSession/guestSession.commands';
import type { GuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import type {
  AddCartItemRequest,
  CreateCartRequest,
  JoinCartRequest,
  SubmitCartRequest,
  UpdateCartItemRequest,
} from '@/models/cart';
import type { StoreFrontCommandFailure } from '@/services/utils/storeFrontApiError';
import type { CartMutationResult, StoreFrontCartCommands } from '../cart/commands';
import type { StoreFrontOrderActions } from '../order/actions';
import type { StoreFrontOrderHistoryCommands } from '../orderHistory/commands';
import type { StoreFrontSessionWorkflowCommands } from '../sessionWorkflow/commands';

export type StoreFrontCartWorkflowCommands = {
  createCart(
    storeId: string,
    request: CreateCartRequest,
  ): Promise<{ status: 'created' } | StoreFrontCommandFailure>;
  joinCart(
    storeId: string,
    request: JoinCartRequest,
  ): Promise<
    | { status: 'joined'; target: 'cart' | 'order'; orderId?: string }
    | StoreFrontCommandFailure
  >;
  loadCart(
    expectedStoreId: string,
  ): Promise<{ status: 'loaded' } | StoreFrontCommandFailure>;
  addItem(
    expectedStoreId: string,
    request: AddCartItemRequest,
  ): Promise<CartMutationResult>;
  updateItem(
    expectedStoreId: string,
    itemId: string,
    request: UpdateCartItemRequest,
  ): Promise<CartMutationResult>;
  removeItem(
    expectedStoreId: string,
    itemId: string,
  ): Promise<CartMutationResult>;
  leaveCart(
    expectedStoreId: string,
  ): Promise<{ status: 'left' } | StoreFrontCommandFailure>;
  submitCart(
    expectedStoreId: string,
    request: SubmitCartRequest,
  ): Promise<{ status: 'submitted'; orderId: string } | StoreFrontCommandFailure>;
  markLoadStarted(): void;
  reportLoadFailure(message: string): void;
};

export function createStoreFrontCartWorkflowCommands(deps: {
  cartCommands: StoreFrontCartCommands;
  guestSessionCommands: GuestSessionCommands;
  orderActions: StoreFrontOrderActions;
  orderHistoryCommands: StoreFrontOrderHistoryCommands;
  sessionStore: GuestSessionStore;
  sessionWorkflowCommands: StoreFrontSessionWorkflowCommands;
}): StoreFrontCartWorkflowCommands {
  const {
    cartCommands,
    guestSessionCommands,
    orderActions,
    orderHistoryCommands,
    sessionStore,
    sessionWorkflowCommands,
  } = deps;

  function handleSessionExpired<T extends { reason?: string; status: string }>(
    expectedStoreId: string,
    result: T,
  ): T {
    if (result.status === 'failed' && result.reason === 'session-expired') {
      sessionWorkflowCommands.clearSession(expectedStoreId);
    }

    return result;
  }

  return {
    markLoadStarted: cartCommands.markLoadStarted,
    reportLoadFailure: cartCommands.reportLoadFailure,

    async createCart(storeId, request) {
      const result = await cartCommands.createCart(storeId, request);
      if (result.status === 'created') {
        guestSessionCommands.startSession({
          guestToken: result.guestToken,
          participantId: result.participantId,
          storeId,
        });

        return { status: 'created' };
      }

      return handleSessionExpired(storeId, result);
    },

    async joinCart(storeId, request) {
      const result = await cartCommands.joinCart(storeId, request);
      if (result.status === 'joined') {
        guestSessionCommands.startSession({
          guestToken: result.guestToken,
          participantId: result.participantId,
          storeId,
        });

        if (result.order) {
          orderActions.orderUpdated(result.order);
          orderHistoryCommands.recordOrder(
            storeId,
            result.order,
            result.guestToken,
          );
        }

        return {
          status: 'joined',
          target: result.target,
          ...(result.order ? { orderId: result.order.id } : {}),
        };
      }

      return handleSessionExpired(storeId, result);
    },

    async loadCart(expectedStoreId) {
      return handleSessionExpired(
        expectedStoreId,
        await cartCommands.loadCart(expectedStoreId),
      );
    },

    async addItem(expectedStoreId, request) {
      return handleSessionExpired(
        expectedStoreId,
        await cartCommands.addItem(expectedStoreId, request),
      );
    },

    async updateItem(expectedStoreId, itemId, request) {
      return handleSessionExpired(
        expectedStoreId,
        await cartCommands.updateItem(expectedStoreId, itemId, request),
      );
    },

    async removeItem(expectedStoreId, itemId) {
      return handleSessionExpired(
        expectedStoreId,
        await cartCommands.removeItem(expectedStoreId, itemId),
      );
    },

    async leaveCart(expectedStoreId) {
      const result = await cartCommands.leaveCart(expectedStoreId);
      if (result.status === 'left') {
        sessionWorkflowCommands.clearSession(expectedStoreId);
      }

      return handleSessionExpired(expectedStoreId, result);
    },

    async submitCart(expectedStoreId, request) {
      const session = sessionStore.getState();
      const token =
        session.storeId === expectedStoreId ? session.guestToken : null;
      const result = await cartCommands.submitCart(expectedStoreId, request);
      if (result.status === 'submitted') {
        orderActions.orderUpdated(result.order);
        const current = sessionStore.getState();
        if (
          token &&
          current.storeId === expectedStoreId &&
          current.guestToken === token
        ) {
          orderHistoryCommands.recordOrder(
            expectedStoreId,
            result.order,
            token,
          );
        }
        return { status: 'submitted', orderId: result.order.id };
      }

      return handleSessionExpired(expectedStoreId, result);
    },
  };
}
