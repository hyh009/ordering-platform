import {
  presentFeedback,
  type FailurePresentation,
} from '@/app/global/feedback/presentFeedback';
import {
  applyFormFailure,
  hasFieldErrors,
  type FormErrorSink,
} from '@/shared/components/form/formFailure';

import type {
  StoreFrontCommandFailure,
  StoreFrontCommandFailureReason,
} from '@/services/utils/storeFrontApiError';

// How a storefront primary-resource (route/init) load failure surfaces, before
// any data is on screen. A transient toast over a blank page is the wrong
// affordance, so the load axis chooses between a full-page error, a redirect,
// or a silent no-op. `FailurePresentation` (the action axis) is global; this
// load axis is storefront-local.
export type StorefrontLoadPresentation = 'page' | 'redirect' | 'silent';

// Single source of truth for "what does each storefront failure reason do".
// The table value has two axes: `action` (a failure while the page already
// shows its data) and `load` (the outcome of the page's primary load). Reading
// this table answers the behavior at a glance, and the exhaustive Record means
// a new reason cannot be added without declaring both presentations.
export const STOREFRONT_FAILURE_PRESENTATION: Record<
  StoreFrontCommandFailureReason,
  { action: FailurePresentation; load: StorefrontLoadPresentation }
> = {
  // Benign race: the active store changed while a request was in flight. The
  // page is already handing off, so there is nothing to show either way.
  'session-store-mismatch': { action: 'silent', load: 'silent' },
  // Belongs next to the form that submitted the code, not a transient toast;
  // on a load it has no form to land in, so it shows the full-page error.
  'invalid-join-code': { action: 'inline', load: 'page' },
  // The session is unusable here, so a load sends the user away.
  'session-expired': { action: 'toast', load: 'redirect' },
  'store-closed': { action: 'toast', load: 'page' },
  'order-locked': { action: 'toast', load: 'page' },
  'sold-out': { action: 'toast', load: 'page' },
  'cart-not-active': { action: 'toast', load: 'page' },
  invalid: { action: 'toast', load: 'page' },
  'not-found': { action: 'toast', load: 'page' },
  network: { action: 'toast', load: 'page' },
  server: { action: 'toast', load: 'page' },
  unknown: { action: 'toast', load: 'page' },
};

// Resolve a primary-load failure to its load directive. This only returns the
// directive; the page acts on it (navigate, render error). It never navigates
// or touches stores.
export function resolveStorefrontLoadFailure(
  failure: StoreFrontCommandFailure,
): StorefrontLoadPresentation {
  return STOREFRONT_FAILURE_PRESENTATION[failure.reason].load;
}

// The load-axis sibling of `handleStoreFrontFailure`: applies a primary-load
// failure to its directive so pages stop hand-rolling the same silent/redirect/
// page switch. The module still never navigates or touches stores — the page
// injects those as callbacks. `onPageError` is optional: a page whose load
// command already writes the error into its own store (e.g. order history) omits
// it; a page fed by the store-agnostic `resumeSession` (cart, invite) passes its
// `reportLoadFailure` so the error lands in the right store.
export function handleStorefrontLoadFailure(
  failure: StoreFrontCommandFailure,
  deps: { onRedirect: () => void; onPageError?: (message: string) => void },
): void {
  switch (resolveStorefrontLoadFailure(failure)) {
    case 'silent':
      return;
    case 'redirect':
      deps.onRedirect();
      return;
    case 'page':
      deps.onPageError?.(failure.message);
      return;
  }
}

// One entry point for every storefront failure, form or not. Field errors (or an
// `inline` reason) go on the form; everything else is global feedback. Pages
// that need a reason-specific reaction (navigate, clear session) handle that
// reason before calling this.
export function handleStoreFrontFailure(
  failure: StoreFrontCommandFailure & { fieldErrors?: Record<string, string> },
  deps: { form?: FormErrorSink } = {},
): void {
  const { form } = deps;
  const kind = STOREFRONT_FAILURE_PRESENTATION[failure.reason].action;

  if (form && (hasFieldErrors(failure.fieldErrors) || kind === 'inline')) {
    applyFormFailure(form, failure);
    return;
  }

  presentFeedback(kind, failure.message);
}
