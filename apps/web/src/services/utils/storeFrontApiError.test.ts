import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/apiError';
import {
  mapStoreFrontApiError,
  type StoreFrontCommandFailureReason,
} from './storeFrontApiError';

function apiError(input: { statusCode: number; code?: string }): ApiError {
  return new ApiError({
    statusCode: input.statusCode,
    code: input.code,
    message: 'backend message',
  });
}

describe('mapStoreFrontApiError', () => {
  // Each backend code must resolve to one stable reason. This is the guard
  // against the same code (e.g. STORE_NOT_FOUND) drifting into several
  // different messages across the codebase.
  const codeReasonCases: Array<{
    code: string;
    reason: StoreFrontCommandFailureReason;
  }> = [
    { code: 'INVALID_GUEST_TOKEN', reason: 'session-expired' },
    { code: 'INVALID_JOIN_CODE', reason: 'invalid-join-code' },
    { code: 'CART_NOT_ACTIVE', reason: 'cart-not-active' },
    { code: 'CART_NOT_FOUND', reason: 'cart-not-active' },
    { code: 'PRODUCT_SOLD_OUT', reason: 'sold-out' },
    { code: 'MODIFIER_SELECTION_INVALID', reason: 'sold-out' },
    { code: 'STORE_NOT_OPEN', reason: 'store-closed' },
    { code: 'ORDER_LOCKED', reason: 'order-locked' },
    { code: 'STORE_NOT_FOUND', reason: 'not-found' },
    { code: 'ORDER_NOT_FOUND', reason: 'not-found' },
    { code: 'CART_ITEM_NOT_FOUND', reason: 'not-found' },
    { code: 'PRODUCT_NOT_FOUND', reason: 'not-found' },
    { code: 'VALIDATION_ERROR', reason: 'invalid' },
    { code: 'ORDER_TYPE_NOT_ENABLED', reason: 'invalid' },
    { code: 'NOT_ITEM_OWNER', reason: 'invalid' },
  ];

  it.each(codeReasonCases)(
    'maps code $code to reason $reason with a non-empty message',
    ({ code, reason }) => {
      const result = mapStoreFrontApiError(apiError({ statusCode: 400, code }));

      expect(result.reason).toBe(reason);
      expect(result.status).toBe('failed');
      expect(result.message.length).toBeGreaterThan(0);
    },
  );

  it('maps every not-found code family to the same reason and message', () => {
    const results = [
      'STORE_NOT_FOUND',
      'ORDER_NOT_FOUND',
      'CART_ITEM_NOT_FOUND',
      'PRODUCT_NOT_FOUND',
    ].map((code) => mapStoreFrontApiError(apiError({ statusCode: 404, code })));

    const messages = new Set(results.map((result) => result.message));

    expect(results.every((result) => result.reason === 'not-found')).toBe(true);
    expect(messages.size).toBe(1);
  });

  it('classifies network failures', () => {
    expect(mapStoreFrontApiError(apiError({ statusCode: 0 })).reason).toBe(
      'network',
    );
  });

  it('classifies 5xx as server', () => {
    expect(mapStoreFrontApiError(apiError({ statusCode: 503 })).reason).toBe(
      'server',
    );
  });

  it('treats an unrecognized 400 as invalid input', () => {
    expect(mapStoreFrontApiError(apiError({ statusCode: 400 })).reason).toBe(
      'invalid',
    );
  });

  it('falls back to unknown for unrecognized errors', () => {
    expect(mapStoreFrontApiError(apiError({ statusCode: 418 })).reason).toBe(
      'unknown',
    );
    expect(mapStoreFrontApiError(new Error('boom')).reason).toBe('unknown');
  });
});
