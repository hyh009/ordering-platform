import { isApiError } from '@/api/apiError';
import { tDefault } from '@/app/i18n';
import { classifyApiError } from './classifyApiError';

import type { ErrorCode } from '@repo/shared';

export type AdminCommandFailureReason =
  | 'already-exists'
  | 'forbidden'
  | 'invalid'
  | 'network'
  | 'not-found'
  | 'server'
  | 'unknown'
  | 'user-disabled';

export type AdminCommandFailure = {
  status: 'failed';
  message: string;
  reason: AdminCommandFailureReason;
};

// Table 1: backend code -> reason. Each code is classified exactly once here.
// Codes not listed fall back to shared infrastructure classification.
const ADMIN_CODE_REASON: Partial<Record<ErrorCode, AdminCommandFailureReason>> = {
  ALLERGEN_ALREADY_EXISTS: 'already-exists',
  DIETARY_MARKER_ALREADY_EXISTS: 'already-exists',
  ORGANIZATION_MEMBERSHIP_ALREADY_EXISTS: 'already-exists',
  USER_ALREADY_EXISTS: 'already-exists',
  ALLERGEN_NOT_FOUND: 'not-found',
  DIETARY_MARKER_NOT_FOUND: 'not-found',
  ORGANIZATION_NOT_FOUND: 'not-found',
  ORGANIZATION_MEMBERSHIP_NOT_FOUND: 'not-found',
  USER_NOT_FOUND: 'not-found',
  VALIDATION_ERROR: 'invalid',
  USER_DISABLED: 'user-disabled',
  FORBIDDEN: 'forbidden',
};

// Table 2: reason -> message. Exhaustive over every reason the mapper can
// produce, so one reason resolves to exactly one message.
const ADMIN_MESSAGES: Record<AdminCommandFailureReason, { key: string; fallback: string }> = {
  'already-exists': {
    key: 'admin.errors.keyAlreadyExists',
    fallback: 'A record with this key already exists.',
  },
  'not-found': {
    key: 'admin.errors.notFound',
    fallback: 'This record was not found.',
  },
  invalid: {
    key: 'admin.errors.invalidInput',
    fallback: 'Invalid input. Check your details and try again.',
  },
  forbidden: {
    key: 'admin.errors.forbidden',
    fallback: 'Your account cannot access this admin area.',
  },
  'user-disabled': {
    key: 'admin.errors.userDisabled',
    fallback: 'This user is disabled and cannot be added.',
  },
  network: {
    key: 'common.errors.checkApiServer',
    fallback: 'Check that the API server is running, then try again.',
  },
  server: {
    key: 'common.errors.apiServerUnavailable',
    fallback: 'The service is temporarily unavailable.',
  },
  unknown: {
    key: 'common.errors.tryAgainLater',
    fallback: 'Try again in a moment.',
  },
};

export function mapAdminApiError(error: unknown): AdminCommandFailure {
  let reason: AdminCommandFailureReason = classifyApiError(error, ADMIN_CODE_REASON);

  // Preserve prior behavior: 403 status without a mapped code is still forbidden.
  if (reason === 'unknown' && isApiError(error) && error.statusCode === 403) {
    reason = 'forbidden';
  }

  const message = ADMIN_MESSAGES[reason];

  return {
    status: 'failed',
    reason,
    message: tDefault(message.key, message.fallback),
  };
}
