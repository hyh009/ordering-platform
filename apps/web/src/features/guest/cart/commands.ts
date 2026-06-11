import type { GuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { tDefault } from '@/app/i18n';
import {
  cartItemInputSchema,
  createCartSchema,
  joinCartSchema,
  submitCartSchema,
  updateCartItemSchema,
} from '@/models/cart';
import { guestCartService } from '@/services/guestCart.service';
import {
  mapGuestApiError,
  type GuestCommandFailure,
} from '@/services/utils/guestApiError';
import type {
  AddCartItemRequest,
  CreateCartRequest,
  JoinCartRequest,
  SubmitCartRequest,
  UpdateCartItemRequest,
} from '@/models/cart';
import type { ZodType } from 'zod';
import type { GuestCartActions } from './actions';

export type CartMutationResult = { status: 'updated' } | GuestCommandFailure;

export type GuestCartCommands = {
  createCart(
    storeId: string,
    request: CreateCartRequest,
  ): Promise<
    | { guestToken: string; participantId: string; status: 'created' }
    | GuestCommandFailure
  >;
  joinCart(
    storeId: string,
    request: JoinCartRequest,
  ): Promise<
    | {
        guestToken: string;
        participantId: string;
        status: 'joined';
        target: 'cart' | 'order';
        order?: Awaited<ReturnType<typeof guestCartService.submitCart>>;
      }
    | GuestCommandFailure
  >;
  loadCart(): Promise<{ status: 'loaded' } | GuestCommandFailure>;
  addItem(request: AddCartItemRequest): Promise<CartMutationResult>;
  updateItem(
    itemId: string,
    request: UpdateCartItemRequest,
  ): Promise<CartMutationResult>;
  removeItem(itemId: string): Promise<CartMutationResult>;
  leaveCart(): Promise<{ status: 'left' } | GuestCommandFailure>;
  submitCart(request: SubmitCartRequest): Promise<
    | {
        order: Awaited<ReturnType<typeof guestCartService.submitCart>>;
        status: 'submitted';
      }
    | GuestCommandFailure
  >;
};

export function createGuestCartCommands(deps: {
  cartActions: GuestCartActions;
  sessionStore: GuestSessionStore;
}): GuestCartCommands {
  const { cartActions, sessionStore } = deps;

  function requireToken(): string | null {
    return sessionStore.getState().guestToken;
  }

  function failMutation(error: unknown): GuestCommandFailure {
    const failure = mapGuestApiError(error);

    cartActions.mutateFailed(failure.message);

    return failure;
  }

  // Validate request inputs at the mutation boundary so both UI and the future
  // AI ordering flow are guarded by the same schema before hitting the API.
  function parseRequest<T>(schema: ZodType<T>, request: unknown): T | null {
    const result = schema.safeParse(request);
    return result.success ? result.data : null;
  }

  const invalidRequest: GuestCommandFailure = {
    status: 'failed',
    message: tDefault(
      'guest.errors.invalidInput',
      'Something in the request was invalid. Please try again.',
    ),
    reason: 'invalid',
  };

  const missingSession: GuestCommandFailure = {
    status: 'failed',
    message: '',
    reason: 'session-expired',
  };

  return {
    async createCart(storeId, request) {
      const parsed = parseRequest(createCartSchema, request);
      if (!parsed) return invalidRequest;

      cartActions.mutateStarted();

      try {
        const result = await guestCartService.createCart(storeId, parsed);

        cartActions.cartUpdated(result.cart);

        return {
          guestToken: result.guestToken,
          participantId: result.participantId,
          status: 'created',
        };
      } catch (error) {
        return failMutation(error);
      }
    },

    async joinCart(storeId, request) {
      const parsed = parseRequest(joinCartSchema, request);
      if (!parsed) return invalidRequest;

      cartActions.mutateStarted();

      try {
        const result = await guestCartService.joinCart(storeId, parsed);

        if (result.session.order) {
          cartActions.cartCleared();
          return {
            guestToken: result.guestToken,
            order: result.session.order,
            participantId: result.session.participantId,
            status: 'joined',
            target: 'order',
          };
        }

        if (result.session.cart) {
          cartActions.cartUpdated(result.session.cart);
          return {
            guestToken: result.guestToken,
            participantId: result.session.participantId,
            status: 'joined',
            target: 'cart',
          };
        }

        return {
          guestToken: result.guestToken,
          participantId: result.session.participantId,
          status: 'joined',
          target: 'cart',
        };
      } catch (error) {
        return failMutation(error);
      }
    },

    async loadCart() {
      const token = requireToken();
      if (!token) return missingSession;

      cartActions.loadStarted();

      try {
        const cart = await guestCartService.getCart(token);

        cartActions.cartUpdated(cart);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapGuestApiError(error);

        cartActions.loadFailed(failure.message);

        return failure;
      }
    },

    async addItem(request) {
      const token = requireToken();
      if (!token) return missingSession;

      const parsed = parseRequest(cartItemInputSchema, request);
      if (!parsed) return invalidRequest;

      cartActions.mutateStarted();

      try {
        const cart = await guestCartService.addItem(token, parsed);

        cartActions.cartUpdated(cart);
        return { status: 'updated' };
      } catch (error) {
        return failMutation(error);
      }
    },

    async updateItem(itemId, request) {
      const token = requireToken();
      if (!token) return missingSession;

      const parsed = parseRequest(updateCartItemSchema, request);
      if (!parsed) return invalidRequest;

      cartActions.mutateStarted();

      try {
        const cart = await guestCartService.updateItem(token, itemId, parsed);

        cartActions.cartUpdated(cart);
        return { status: 'updated' };
      } catch (error) {
        return failMutation(error);
      }
    },

    async removeItem(itemId) {
      const token = requireToken();
      if (!token) return missingSession;

      cartActions.mutateStarted();

      try {
        const cart = await guestCartService.removeItem(token, itemId);

        cartActions.cartUpdated(cart);
        return { status: 'updated' };
      } catch (error) {
        return failMutation(error);
      }
    },

    async leaveCart() {
      const token = requireToken();
      if (!token) return missingSession;

      cartActions.mutateStarted();

      try {
        await guestCartService.leaveCart(token);

        cartActions.cartCleared();
        return { status: 'left' };
      } catch (error) {
        return failMutation(error);
      }
    },

    async submitCart(request) {
      const token = requireToken();
      if (!token) return missingSession;

      const parsed = parseRequest(submitCartSchema, request);
      if (!parsed) return invalidRequest;

      cartActions.mutateStarted();

      try {
        const order = await guestCartService.submitCart(token, parsed);

        cartActions.cartCleared();
        return { order, status: 'submitted' };
      } catch (error) {
        return failMutation(error);
      }
    },
  };
}
