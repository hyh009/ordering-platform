import {
  presentFailure,
  type FailurePresentation,
  type FormErrorSink,
} from '@/app/global/feedback/presentFailure';

import type {
  MerchantCommandFailure,
  MerchantCommandFailureReason,
} from '@/services/utils/merchantApiError';

// Single source of truth for "what does each merchant failure reason do".
// The exhaustive Record means a new reason cannot be added without declaring
// its presentation.
export const MERCHANT_FAILURE_PRESENTATION: Record<
  MerchantCommandFailureReason,
  FailurePresentation
> = {
  // Belongs next to the form that triggered it, not a transient toast.
  invalid: 'inline',
  // Resource-level conflicts (already exists, stale data): toast so the page
  // stays usable and the user can decide whether to refresh.
  conflict: 'toast',
  // Permission failures are unexpected mid-action — toast so the page
  // stays usable.
  forbidden: 'toast',
  'not-found': 'toast',
  network: 'toast',
  server: 'toast',
  unknown: 'toast',
};

// One entry point for every merchant failure, form or not. Delegates to the
// shared dispatch with this area's presentation table. Pages that need a
// reason-specific reaction (navigate, refresh) handle that reason before
// calling this.
export function handleMerchantFailure(
  failure: MerchantCommandFailure & { fieldErrors?: Record<string, string> },
  deps: { form?: FormErrorSink } = {},
): void {
  presentFailure(failure, MERCHANT_FAILURE_PRESENTATION, deps);
}
