import type { GuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { tDefault } from '@/app/i18n';
import {
  cartItemInputSchema,
  createCartSchema,
  joinCartSchema,
  submitCartSchema,
  updateCartItemSchema,
} from '@/models/cart';
import { storeFrontCartService } from '@/services/storeFrontCart.service';
import {
  mapStoreFrontApiError,
  type StoreFrontCommandFailure,
} from '@/services/utils/storeFrontApiError';
import type {
  AddCartItemRequest,
  CreateCartRequest,
  JoinCartRequest,
  SubmitCartRequest,
  UpdateCartItemRequest,
} from '@/models/cart';
import type { StoreFrontCartActions } from './actions';
import type { TenantStore } from '../tenant/store';

export type CartMutationResult =
  | { status: 'updated' }
  | StoreFrontCommandFailure;

export type StoreFrontCartCommands = {
  createCart(
    storeId: string,
    request: CreateCartRequest,
  ): Promise<
    | { guestToken: string; participantId: string; status: 'created' }
    | StoreFrontCommandFailure
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
        order?: Awaited<ReturnType<typeof storeFrontCartService.submitCart>>;
      }
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
  ): Promise<
    | {
        order: Awaited<ReturnType<typeof storeFrontCartService.submitCart>>;
        status: 'submitted';
      }
    | StoreFrontCommandFailure
  >;
};

export function createStoreFrontCartCommands(deps: {
  cartActions: StoreFrontCartActions;
  sessionStore: GuestSessionStore;
  tenantStore: TenantStore;
}): StoreFrontCartCommands {
  const { cartActions, sessionStore, tenantStore } = deps;

  function failMutation(
    error: unknown,
    expectedStoreId: string,
    token?: string,
  ): StoreFrontCommandFailure {
    const failure = mapStoreFrontApiError(error);

    if (
      isActiveStore(expectedStoreId) &&
      (token === undefined || hasScopedToken(expectedStoreId, token))
    ) {
      cartActions.mutateFailed(failure.message);
    }

    return failure;
  }

  const invalidRequest: StoreFrontCommandFailure = {
    status: 'failed',
    message: tDefault(
      'guest.errors.invalidInput',
      'Something in the request was invalid. Please try again.',
    ),
    reason: 'invalid',
  };

  const missingSession: StoreFrontCommandFailure = {
    status: 'failed',
    message: '',
    reason: 'session-expired',
  };
  const mismatchedSession: StoreFrontCommandFailure = {
    status: 'failed',
    message: '',
    reason: 'session-store-mismatch',
  };

  function requireScopedToken(
    expectedStoreId: string,
  ): string | StoreFrontCommandFailure {
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
        const result = await storeFrontCartService.createCart(storeId, parsed);
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
        const result = await storeFrontCartService.joinCart(storeId, parsed);
        if (!isActiveStore(storeId)) return mismatchedSession;

        if (result.session.order) {
          // The session may carry BOTH an order and a live draft cart now.
          // Hydrate the cart store with the draft when present; otherwise clear.
          // TODO(phase4): decide the join landing target when both are present;
          // for now preserve current behavior and route to the order.
          if (result.session.cart) {
            cartActions.cartUpdated(result.session.cart);
          } else {
            cartActions.cartCleared();
          }
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
        const cart = await storeFrontCartService.getCart(token);
        if (!hasScopedToken(expectedStoreId, token)) {
          return mismatchedSession;
        }

        cartActions.cartUpdated(cart);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapStoreFrontApiError(error);

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
        const cart = await storeFrontCartService.addItem(token, parsed);
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
        const cart = await storeFrontCartService.updateItem(
          token,
          itemId,
          parsed,
        );
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
        const cart = await storeFrontCartService.removeItem(token, itemId);
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
        await storeFrontCartService.leaveCart(token);
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
        const order = await storeFrontCartService.submitCart(token, parsed);
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
