import {
  getApiFailureReason,
  hasApiErrorCode,
  isApiError,
} from '@/api/apiError';
import { tDefault } from '@/app/i18n';

export type StoreFrontCommandFailureReason =
  | 'cart-not-active'
  | 'invalid'
  | 'invalid-join-code'
  | 'network'
  | 'not-found'
  | 'order-locked'
  | 'server'
  | 'session-store-mismatch'
  | 'session-expired'
  | 'sold-out'
  | 'store-closed'
  | 'unknown';

export type StoreFrontCommandFailure = {
  status: 'failed';
  message: string;
  reason: StoreFrontCommandFailureReason;
};

function failure(
  reason: StoreFrontCommandFailureReason,
  message: string,
): StoreFrontCommandFailure {
  return { status: 'failed', message, reason };
}

export function mapStoreFrontApiError(error: unknown): StoreFrontCommandFailure {
  if (hasApiErrorCode(error, 'INVALID_GUEST_TOKEN')) {
    return failure(
      'session-expired',
      tDefault(
        'guest.errors.sessionExpired',
        'Your ordering session has ended.',
      ),
    );
  }

  if (hasApiErrorCode(error, 'INVALID_JOIN_CODE')) {
    return failure(
      'invalid-join-code',
      tDefault(
        'guest.errors.invalidJoinCode',
        'This invite is no longer valid.',
      ),
    );
  }

  if (
    hasApiErrorCode(error, 'CART_NOT_ACTIVE') ||
    hasApiErrorCode(error, 'CART_NOT_FOUND')
  ) {
    return failure(
      'cart-not-active',
      tDefault('guest.errors.cartNotActive', 'This cart is no longer active.'),
    );
  }

  if (
    hasApiErrorCode(error, 'PRODUCT_SOLD_OUT') ||
    hasApiErrorCode(error, 'MODIFIER_SELECTION_INVALID')
  ) {
    return failure(
      'sold-out',
      tDefault(
        'guest.errors.itemUnavailable',
        'Some items are no longer available. Please review your selection.',
      ),
    );
  }

  if (hasApiErrorCode(error, 'STORE_NOT_OPEN')) {
    return failure(
      'store-closed',
      tDefault(
        'guest.errors.storeClosed',
        'The store is currently closed for ordering.',
      ),
    );
  }

  if (hasApiErrorCode(error, 'ORDER_LOCKED')) {
    return failure(
      'order-locked',
      tDefault(
        'guest.errors.orderLocked',
        'This order can no longer be changed. Please ask the staff.',
      ),
    );
  }

  if (
    hasApiErrorCode(error, 'STORE_NOT_FOUND') ||
    hasApiErrorCode(error, 'ORDER_NOT_FOUND') ||
    hasApiErrorCode(error, 'CART_ITEM_NOT_FOUND') ||
    hasApiErrorCode(error, 'PRODUCT_NOT_FOUND')
  ) {
    return failure(
      'not-found',
      tDefault('guest.errors.notFound', 'This was not found.'),
    );
  }

  if (
    hasApiErrorCode(error, 'VALIDATION_ERROR') ||
    hasApiErrorCode(error, 'ORDER_TYPE_NOT_ENABLED') ||
    hasApiErrorCode(error, 'NOT_ITEM_OWNER') ||
    (isApiError(error) && error.statusCode === 400)
  ) {
    return failure(
      'invalid',
      tDefault(
        'guest.errors.invalidInput',
        'Something in the request was invalid. Please try again.',
      ),
    );
  }

  const reason = getApiFailureReason(error);

  if (reason === 'network') {
    return failure(
      'network',
      tDefault(
        'guest.errors.network',
        'Connection problem. Check your network and try again.',
      ),
    );
  }

  if (reason === 'server') {
    return failure(
      'server',
      tDefault(
        'common.errors.apiServerUnavailable',
        'The service is temporarily unavailable.',
      ),
    );
  }

  return failure(
    'unknown',
    tDefault('common.errors.tryAgainLater', 'Try again in a moment.'),
  );
}
