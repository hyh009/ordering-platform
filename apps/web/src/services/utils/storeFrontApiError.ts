import { isApiError } from '@/api/apiError';
import { tDefault } from '@/app/i18n';
import { classifyApiError } from './classifyApiError';

import type { ErrorCode } from '@repo/shared';

export type StoreFrontCommandFailureReason =
  | 'assistant-conversation-full'
  | 'assistant-unavailable'
  | 'cart-not-active'
  | 'invalid'
  | 'invalid-join-code'
  | 'network'
  | 'not-found'
  | 'order-locked'
  | 'quantity-limit'
  | 'rate-limited'
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

// `session-store-mismatch` is a command-guard control signal, never produced
// from an API error, so it is excluded from the mapper's classification and
// wording tables. Command guards build that failure with their own message.
type StoreFrontApiFailureReason = Exclude<
  StoreFrontCommandFailureReason,
  'session-store-mismatch'
>;

// Table 1: backend code -> reason. Each code is classified exactly once here.
// Codes not listed fall back to shared infrastructure classification.
const STOREFRONT_CODE_REASON: Partial<
  Record<ErrorCode, StoreFrontApiFailureReason>
> = {
  INVALID_GUEST_TOKEN: 'session-expired',
  INVALID_JOIN_CODE: 'invalid-join-code',
  CART_NOT_ACTIVE: 'cart-not-active',
  CART_NOT_FOUND: 'cart-not-active',
  PRODUCT_SOLD_OUT: 'sold-out',
  MODIFIER_SELECTION_INVALID: 'sold-out',
  STORE_NOT_OPEN: 'store-closed',
  ORDER_LOCKED: 'order-locked',
  STORE_NOT_FOUND: 'not-found',
  ORDER_NOT_FOUND: 'not-found',
  CART_ITEM_NOT_FOUND: 'not-found',
  PRODUCT_NOT_FOUND: 'not-found',
  VALIDATION_ERROR: 'invalid',
  ORDER_TYPE_NOT_ENABLED: 'invalid',
  NOT_ITEM_OWNER: 'invalid',
  // The server refusing a merge that would put more than a line may hold. The
  // same thing to the guest as the per-product limit this app checks before it
  // sends, so it lands on the same reason and the same dialog.
  CART_ITEM_QUANTITY_LIMIT: 'quantity-limit',
  // The assistant is optional, so "off for this deployment" and "the provider
  // could not answer" land on one reason: both mean the panel cannot help right
  // now, and neither is something the guest can act on differently. Ordering
  // itself is unaffected either way.
  AI_ORDERING_DISABLED: 'assistant-unavailable',
  AI_ORDERING_UNAVAILABLE: 'assistant-unavailable',
  AI_ORDERING_CONVERSATION_FULL: 'assistant-conversation-full',
  // A prompt the client answered that the server no longer holds. The guest's
  // text is fine; the reference to the question is stale.
  AI_ORDERING_PROMPT_NOT_FOUND: 'invalid',
  TOO_MANY_REQUESTS: 'rate-limited',
};

// Table 2: reason -> message. Exhaustive over every reason the mapper can
// produce, so one reason resolves to exactly one message.
const STOREFRONT_MESSAGES: Record<
  StoreFrontApiFailureReason,
  { key: string; fallback: string }
> = {
  'session-expired': {
    key: 'guest.errors.sessionExpired',
    fallback: 'Your ordering session has ended.',
  },
  'invalid-join-code': {
    key: 'guest.errors.invalidJoinCode',
    fallback: 'This invite is no longer valid.',
  },
  'cart-not-active': {
    key: 'guest.errors.cartNotActive',
    fallback: 'This cart is no longer active.',
  },
  'sold-out': {
    key: 'guest.errors.itemUnavailable',
    fallback:
      'Some items are no longer available. Please review your selection.',
  },
  'store-closed': {
    key: 'guest.errors.storeClosed',
    fallback: 'The store is currently closed for ordering.',
  },
  'order-locked': {
    key: 'guest.errors.orderLocked',
    fallback: 'This order can no longer be changed. Please ask the staff.',
  },
  'quantity-limit': {
    key: 'guest.errors.quantityLimit',
    fallback:
      'You can order up to 99 of one item here. For more, please ask a member of staff.',
  },
  'not-found': {
    key: 'guest.errors.notFound',
    fallback: 'This was not found.',
  },
  'assistant-unavailable': {
    key: 'guest.errors.assistantUnavailable',
    fallback: 'The ordering assistant is unavailable right now.',
  },
  'assistant-conversation-full': {
    key: 'guest.errors.assistantConversationFull',
    fallback: 'This assistant conversation has reached its limit.',
  },
  'rate-limited': {
    key: 'guest.errors.tooManyRequests',
    fallback: 'Too many requests. Please wait a moment and try again.',
  },
  invalid: {
    key: 'guest.errors.invalidInput',
    fallback: 'Something in the request was invalid. Please try again.',
  },
  network: {
    key: 'guest.errors.network',
    fallback: 'Connection problem. Check your network and try again.',
  },
  server: {
    key: 'common.errors.apiServerUnavailable',
    fallback: 'The service is temporarily unavailable. Please try again later.',
  },
  unknown: {
    key: 'common.errors.tryAgainLater',
    fallback: 'Try again in a moment.',
  },
};

/**
 * The failure for a write this app declined to send because it would take one
 * product past the per-product limit. Built here so it reads exactly like the
 * server's refusal of the same thing.
 */
export function storeFrontQuantityLimitFailure(): StoreFrontCommandFailure {
  const message = STOREFRONT_MESSAGES['quantity-limit'];

  return {
    status: 'failed',
    reason: 'quantity-limit',
    message: tDefault(message.key, message.fallback),
  };
}

export function mapStoreFrontApiError(
  error: unknown,
): StoreFrontCommandFailure {
  let reason: StoreFrontApiFailureReason = classifyApiError(
    error,
    STOREFRONT_CODE_REASON,
  );

  // Preserve prior behavior: any other 400 is treated as invalid input.
  if (reason === 'unknown' && isApiError(error) && error.statusCode === 400) {
    reason = 'invalid';
  }

  const message = STOREFRONT_MESSAGES[reason];

  return {
    status: 'failed',
    reason,
    message: tDefault(message.key, message.fallback),
  };
}
