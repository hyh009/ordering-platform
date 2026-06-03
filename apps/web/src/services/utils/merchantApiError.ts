import {
  getApiFailureReason,
  hasApiErrorCode,
  isApiError,
} from '@/api/apiError';
import { tDefault } from '@/app/i18n';

export type MerchantCommandFailureReason =
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

const notFoundCodes = new Set(['STORE_NOT_FOUND', 'TAG_NOT_FOUND']);

export function mapMerchantApiError(error: unknown): MerchantCommandFailure {
  if (Array.from(notFoundCodes).some((code) => hasApiErrorCode(error, code))) {
    return {
      message: tDefault(
        'merchant.errors.notFound',
        'This record was not found.',
      ),
      reason: 'not-found',
      status: 'failed',
    };
  }

  if (hasApiErrorCode(error, 'VALIDATION_ERROR')) {
    return {
      message: tDefault(
        'merchant.errors.invalidInput',
        'Invalid input. Check your details and try again.',
      ),
      reason: 'invalid',
      status: 'failed',
    };
  }

  if (isApiError(error) && error.statusCode === 403) {
    return {
      message: tDefault(
        'merchant.errors.forbidden',
        'You do not have permission to perform this action.',
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
