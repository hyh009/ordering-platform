import type { GuestSessionCommands } from '@/app/global/guestSession/guestSession.commands';
import type {
  AddCartItemRequest,
  CreateCartRequest,
  JoinCartRequest,
  SubmitCartRequest,
  UpdateCartItemRequest,
} from '@/models/cart';
import type { GuestCommandFailure } from '@/services/utils/guestApiError';
import type { CartMutationResult, GuestCartCommands } from '../cart/commands';
import type { GuestOrderActions } from '../order/actions';
import type { GuestSessionWorkflowCommands } from '../sessionWorkflow/commands';

export type GuestCartWorkflowCommands = {
  createCart(
    storeId: string,
    request: CreateCartRequest,
  ): Promise<{ status: 'created' } | GuestCommandFailure>;
  joinCart(
    storeId: string,
    request: JoinCartRequest,
  ): Promise<
    | { status: 'joined'; target: 'cart' | 'order'; orderId?: string }
    | GuestCommandFailure
  >;
  loadCart(
    expectedStoreId: string,
  ): Promise<{ status: 'loaded' } | GuestCommandFailure>;
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
  ): Promise<{ status: 'left' } | GuestCommandFailure>;
  submitCart(
    expectedStoreId: string,
    request: SubmitCartRequest,
  ): Promise<{ status: 'submitted'; orderId: string } | GuestCommandFailure>;
};

export function createGuestCartWorkflowCommands(deps: {
  cartCommands: GuestCartCommands;
  guestSessionCommands: GuestSessionCommands;
  orderActions: GuestOrderActions;
  sessionWorkflowCommands: GuestSessionWorkflowCommands;
}): GuestCartWorkflowCommands {
  const {
    cartCommands,
    guestSessionCommands,
    orderActions,
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
      const result = await cartCommands.submitCart(expectedStoreId, request);
      if (result.status === 'submitted') {
        orderActions.orderUpdated(result.order);
        return { status: 'submitted', orderId: result.order.id };
      }

      return handleSessionExpired(expectedStoreId, result);
    },
  };
}
