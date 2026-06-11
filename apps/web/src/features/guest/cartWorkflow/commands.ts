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
    { status: 'joined'; target: 'cart' | 'order' } | GuestCommandFailure
  >;
  loadCart(): Promise<{ status: 'loaded' } | GuestCommandFailure>;
  addItem(request: AddCartItemRequest): Promise<CartMutationResult>;
  updateItem(
    itemId: string,
    request: UpdateCartItemRequest,
  ): Promise<CartMutationResult>;
  removeItem(itemId: string): Promise<CartMutationResult>;
  leaveCart(): Promise<{ status: 'left' } | GuestCommandFailure>;
  submitCart(
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
    result: T,
  ): T {
    if (result.status === 'failed' && result.reason === 'session-expired') {
      sessionWorkflowCommands.clearSession();
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

      return handleSessionExpired(result);
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

        return { status: 'joined', target: result.target };
      }

      return handleSessionExpired(result);
    },

    async loadCart() {
      return handleSessionExpired(await cartCommands.loadCart());
    },

    async addItem(request) {
      return handleSessionExpired(await cartCommands.addItem(request));
    },

    async updateItem(itemId, request) {
      return handleSessionExpired(
        await cartCommands.updateItem(itemId, request),
      );
    },

    async removeItem(itemId) {
      return handleSessionExpired(await cartCommands.removeItem(itemId));
    },

    async leaveCart() {
      const result = await cartCommands.leaveCart();
      if (result.status === 'left') {
        sessionWorkflowCommands.clearSession();
      }

      return handleSessionExpired(result);
    },

    async submitCart(request) {
      const result = await cartCommands.submitCart(request);
      if (result.status === 'submitted') {
        orderActions.orderUpdated(result.order);
        return { status: 'submitted', orderId: result.order.id };
      }

      return handleSessionExpired(result);
    },
  };
}
