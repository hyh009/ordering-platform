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
import type { GuestCartActions } from './actions';
import type { GuestTenantStore } from '../tenant/store';

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
  ): Promise<
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
  tenantStore: GuestTenantStore;
}): GuestCartCommands {
  const { cartActions, sessionStore, tenantStore } = deps;

  function failMutation(
    error: unknown,
    expectedStoreId: string,
    token?: string,
  ): GuestCommandFailure {
    const failure = mapGuestApiError(error);

    if (
      isActiveStore(expectedStoreId) &&
      (token === undefined || hasScopedToken(expectedStoreId, token))
    ) {
      cartActions.mutateFailed(failure.message);
    }

    return failure;
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
  const mismatchedSession: GuestCommandFailure = {
    status: 'failed',
    message: '',
    reason: 'session-store-mismatch',
  };

  function requireScopedToken(
    expectedStoreId: string,
  ): string | GuestCommandFailure {
    if (tenantStore.getState().activeStoreId !== expectedStoreId) {
      return mismatchedSession;
    }
    const session = sessionStore.getState();
    if (!session.guestToken) return missingSession;
    if (session.storeId !== expectedStoreId) return mismatchedSession;
    return session.guestToken;
  }

  function isActiveStore(storeId: string): boolean {
    return tenantStore.getState().activeStoreId === storeId;
  }

  function hasScopedToken(storeId: string, token: string): boolean {
    return requireScopedToken(storeId) === token;
  }

  return {
    async createCart(storeId, request) {
      if (!isActiveStore(storeId)) return mismatchedSession;
      const validation = createCartSchema.safeParse(request);
      if (!validation.success) return invalidRequest;
      const parsed = validation.data;

      cartActions.mutateStarted();

      try {
        const result = await guestCartService.createCart(storeId, parsed);
        if (!isActiveStore(storeId)) return mismatchedSession;

        cartActions.cartUpdated(result.cart);

        return {
          guestToken: result.guestToken,
          participantId: result.participantId,
          status: 'created',
        };
      } catch (error) {
        return failMutation(error, storeId);
      }
    },

    async joinCart(storeId, request) {
      if (!isActiveStore(storeId)) return mismatchedSession;
      const validation = joinCartSchema.safeParse(request);
      if (!validation.success) return invalidRequest;
      const parsed = validation.data;

      cartActions.mutateStarted();

      try {
        const result = await guestCartService.joinCart(storeId, parsed);
        if (!isActiveStore(storeId)) return mismatchedSession;

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
        return failMutation(error, storeId);
      }
    },

    async loadCart(expectedStoreId) {
      const scoped = requireScopedToken(expectedStoreId);
      if (typeof scoped !== 'string') return scoped;
      const token = scoped;

      cartActions.loadStarted();

      try {
        const cart = await guestCartService.getCart(token);
        if (!hasScopedToken(expectedStoreId, token)) {
          return mismatchedSession;
        }

        cartActions.cartUpdated(cart);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapGuestApiError(error);

        if (hasScopedToken(expectedStoreId, token)) {
          cartActions.loadFailed(failure.message);
        }

        return failure;
      }
    },

    async addItem(expectedStoreId, request) {
      const scoped = requireScopedToken(expectedStoreId);
      if (typeof scoped !== 'string') return scoped;
      const token = scoped;

      const validation = cartItemInputSchema.safeParse(request);
      if (!validation.success) return invalidRequest;
      const parsed = validation.data;

      cartActions.mutateStarted();

      try {
        const cart = await guestCartService.addItem(token, parsed);
        if (!hasScopedToken(expectedStoreId, token)) {
          return mismatchedSession;
        }

        cartActions.cartUpdated(cart);
        return { status: 'updated' };
      } catch (error) {
        return failMutation(error, expectedStoreId, token);
      }
    },

    async updateItem(expectedStoreId, itemId, request) {
      const scoped = requireScopedToken(expectedStoreId);
      if (typeof scoped !== 'string') return scoped;
      const token = scoped;

      const validation = updateCartItemSchema.safeParse(request);
      if (!validation.success) return invalidRequest;
      const parsed = validation.data;

      cartActions.mutateStarted();

      try {
        const cart = await guestCartService.updateItem(token, itemId, parsed);
        if (!hasScopedToken(expectedStoreId, token)) {
          return mismatchedSession;
        }

        cartActions.cartUpdated(cart);
        return { status: 'updated' };
      } catch (error) {
        return failMutation(error, expectedStoreId, token);
      }
    },

    async removeItem(expectedStoreId, itemId) {
      const scoped = requireScopedToken(expectedStoreId);
      if (typeof scoped !== 'string') return scoped;
      const token = scoped;

      cartActions.mutateStarted();

      try {
        const cart = await guestCartService.removeItem(token, itemId);
        if (!hasScopedToken(expectedStoreId, token)) {
          return mismatchedSession;
        }

        cartActions.cartUpdated(cart);
        return { status: 'updated' };
      } catch (error) {
        return failMutation(error, expectedStoreId, token);
      }
    },

    async leaveCart(expectedStoreId) {
      const scoped = requireScopedToken(expectedStoreId);
      if (typeof scoped !== 'string') return scoped;
      const token = scoped;

      cartActions.mutateStarted();

      try {
        await guestCartService.leaveCart(token);
        if (!hasScopedToken(expectedStoreId, token)) {
          return mismatchedSession;
        }

        cartActions.cartCleared();
        return { status: 'left' };
      } catch (error) {
        return failMutation(error, expectedStoreId, token);
      }
    },

    async submitCart(expectedStoreId, request) {
      const scoped = requireScopedToken(expectedStoreId);
      if (typeof scoped !== 'string') return scoped;
      const token = scoped;

      const validation = submitCartSchema.safeParse(request);
      if (!validation.success) return invalidRequest;
      const parsed = validation.data;

      cartActions.mutateStarted();

      try {
        const order = await guestCartService.submitCart(token, parsed);
        if (!hasScopedToken(expectedStoreId, token)) {
          return mismatchedSession;
        }

        cartActions.cartCleared();
        return { order, status: 'submitted' };
      } catch (error) {
        return failMutation(error, expectedStoreId, token);
      }
    },
  };
}
