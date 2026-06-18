import { getApiFailureReason, isApiError } from '@/api/apiError';

import type { ErrorCode } from '@repo/shared';

// Infrastructure failure reasons present in every domain failure union.
// Domains widen this with their own code-specific reasons.
export type BaseFailureReason = 'network' | 'server' | 'unknown';

// Single place that turns a backend error into a failure reason.
// A domain passes its own `code -> reason` table; anything not listed there
// falls back to the shared infrastructure classification. Keeps the
// classification of a given code in exactly one place per domain.
export function classifyApiError<R extends string>(
  error: unknown,
  codeReason: Partial<Record<ErrorCode, R>>,
): R | BaseFailureReason {
  if (isApiError(error) && error.code) {
    const mapped = codeReason[error.code as ErrorCode];
    if (mapped) {
      return mapped;
    }
  }

  const reason = getApiFailureReason(error);

  if (reason === 'network') {
    return 'network';
  }

  if (reason === 'server') {
    return 'server';
  }

  return 'unknown';
}
