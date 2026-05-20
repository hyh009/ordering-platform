import {
  getApiFailureReason,
  hasApiErrorCode,
  isApiError,
} from '@/api/apiError';
import { tDefault } from '@/app/i18n';

export type AdminCommandFailureReason =
  | 'already-exists'
  | 'forbidden'
  | 'invalid'
  | 'network'
  | 'not-found'
  | 'server'
  | 'unknown';

export type AdminCommandFailure = {
  status: 'failed';
  message: string;
  reason: AdminCommandFailureReason;
};

const duplicateCodes = new Set([
  'ALLERGEN_ALREADY_EXISTS',
  'DIETARY_MARKER_ALREADY_EXISTS',
]);

const notFoundCodes = new Set([
  'ALLERGEN_NOT_FOUND',
  'DIETARY_MARKER_NOT_FOUND',
  'ORGANIZATION_NOT_FOUND',
]);

export function mapAdminApiError(error: unknown): AdminCommandFailure {
  if (Array.from(duplicateCodes).some((code) => hasApiErrorCode(error, code))) {
    return {
      message: tDefault(
        'admin.errors.keyAlreadyExists',
        'A record with this key already exists.',
      ),
      reason: 'already-exists',
      status: 'failed',
    };
  }

  if (Array.from(notFoundCodes).some((code) => hasApiErrorCode(error, code))) {
    return {
      message: tDefault('admin.errors.notFound', 'This record was not found.'),
      reason: 'not-found',
      status: 'failed',
    };
  }

  if (hasApiErrorCode(error, 'VALIDATION_ERROR')) {
    return {
      message: tDefault(
        'admin.errors.validation',
        'Check the highlighted fields and try again.',
      ),
      reason: 'invalid',
      status: 'failed',
    };
  }

  if (isApiError(error) && error.statusCode === 403) {
    return {
      message: tDefault(
        'admin.errors.forbidden',
        'Your account cannot access this admin area.',
      ),
      reason: 'forbidden',
      status: 'failed',
    };
  }

  const reason = getApiFailureReason(error);

  if (reason === 'network') {
    return {
      message: tDefault(
        'common.errors.checkApiServer',
        'Check that the API server is running, then try again.',
      ),
      reason: 'network',
      status: 'failed',
    };
  }

  if (reason === 'server') {
    return {
      message: tDefault(
        'common.errors.apiServerUnavailable',
        'The service is temporarily unavailable.',
      ),
      reason: 'server',
      status: 'failed',
    };
  }

  return {
    message: tDefault('common.errors.tryAgainLater', 'Try again in a moment.'),
    reason: 'unknown',
    status: 'failed',
  };
}
