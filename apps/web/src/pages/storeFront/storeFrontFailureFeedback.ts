import {
  presentFailure,
  type FailurePresentation,
  type FormErrorSink,
} from '@/app/global/feedback/presentFailure';

import type {
  StoreFrontCommandFailure,
  StoreFrontCommandFailureReason,
} from '@/services/utils/storeFrontApiError';

// Single source of truth for "what does each storefront failure reason do".
// Reading this table answers the behavior at a glance, and the exhaustive
// Record means a new reason cannot be added without declaring its presentation.
export const STOREFRONT_FAILURE_PRESENTATION: Record<
  StoreFrontCommandFailureReason,
  FailurePresentation
> = {
  // Benign race: the active store changed while a request was in flight. The
  // page is already handing off, so there is nothing to show.
  'session-store-mismatch': 'silent',
  // Belongs next to the form that submitted the code, not a transient toast.
  'invalid-join-code': 'inline',
  'session-expired': 'toast',
  'store-closed': 'toast',
  'order-locked': 'toast',
  'sold-out': 'toast',
  'cart-not-active': 'toast',
  invalid: 'toast',
  'not-found': 'toast',
  network: 'toast',
  server: 'toast',
  unknown: 'toast',
};

// One entry point for every storefront failure, form or not. Delegates to the
// shared dispatch with this area's presentation table. Pages that need a
// reason-specific reaction (navigate, clear session) handle that reason before
// calling this.
export function handleStoreFrontFailure(
  failure: StoreFrontCommandFailure & { fieldErrors?: Record<string, string> },
  deps: { form?: FormErrorSink } = {},
): void {
  presentFailure(failure, STOREFRONT_FAILURE_PRESENTATION, deps);
}
