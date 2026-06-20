import { isApiError } from '@/api/apiError';
import { tDefault } from '@/app/i18n';
import type { UploadedImage } from '@/models/asset';
import { classifyApiError } from './classifyApiError';

import type { ErrorCode } from '@repo/shared';

export type MerchantCommandFailureReason =
  | 'conflict'
  | 'forbidden'
  | 'invalid'
  | 'network'
  | 'not-found'
  | 'server'
  | 'unknown';

export type MerchantCommandFailure = {
  status: 'failed';
  message: string;
  reason: MerchantCommandFailureReason;
};

export type UploadImageResult =
  | { status: 'uploaded'; image: UploadedImage }
  | MerchantCommandFailure;

// Table 1: backend code -> reason. Each code is classified exactly once here.
// Codes not listed fall back to shared infrastructure classification.
const MERCHANT_CODE_REASON: Partial<Record<ErrorCode, MerchantCommandFailureReason>> = {
  STORE_NOT_FOUND: 'not-found',
  CATEGORY_NOT_FOUND: 'not-found',
  PRODUCT_MODIFIER_NOT_FOUND: 'not-found',
  PRODUCT_NOT_FOUND: 'not-found',
  TAG_NOT_FOUND: 'not-found',
  VALIDATION_ERROR: 'invalid',
  INVALID_FIELD_VALUE: 'invalid',
  RESOURCE_ALREADY_EXISTS: 'conflict',
  FORBIDDEN: 'forbidden',
};

// Table 2: reason -> message. Exhaustive over every reason the mapper can
// produce, so one reason resolves to exactly one message.
const MERCHANT_MESSAGES: Record<MerchantCommandFailureReason, { key: string; fallback: string }> = {
  'not-found': {
    key: 'merchant.errors.notFound',
    fallback: 'This record was not found.',
  },
  invalid: {
    key: 'merchant.errors.invalidInput',
    fallback: 'Invalid input. Check your details and try again.',
  },
  conflict: {
    key: 'merchant.errors.conflict',
    fallback: 'This record already exists or has been changed. Please refresh and try again.',
  },
  forbidden: {
    key: 'merchant.errors.forbidden',
    fallback: 'You do not have permission to perform this action.',
  },
  network: {
    key: 'common.errors.checkApiServer',
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

export function mapMerchantApiError(error: unknown): MerchantCommandFailure {
  let reason: MerchantCommandFailureReason = classifyApiError(error, MERCHANT_CODE_REASON);

  // Preserve prior behavior: 403 status without a mapped code is still forbidden.
  if (reason === 'unknown' && isApiError(error) && error.statusCode === 403) {
    reason = 'forbidden';
  }

  const message = MERCHANT_MESSAGES[reason];

  return {
    status: 'failed',
    reason,
    message: tDefault(message.key, message.fallback),
  };
}
