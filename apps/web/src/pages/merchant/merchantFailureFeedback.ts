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
  MerchantCommandFailure,
  MerchantCommandFailureReason,
} from '@/services/utils/merchantApiError';

// How a merchant primary-resource (route/init) load failure surfaces, before
// any data is on screen. A transient toast over a blank page is the wrong
// affordance, so the load axis chooses between a full-page error, a redirect,
// or a silent no-op. `FailurePresentation` (the action axis) is global; this
// load axis is merchant-local.
export type MerchantLoadPresentation = 'page' | 'redirect' | 'silent';

// Single source of truth for "what does each merchant failure reason do".
// The table value has two axes: `action` (a failure while the page already
// shows its data) and `load` (the outcome of the page's primary load). The
// exhaustive Record means a new reason cannot be added without declaring both
// presentations.
//
// Merchant pages are form-heavy, so action failures show inline on the form
// that triggered them: field errors land on the fields, and every other reason
// becomes the form's submit message. On a page with no form, `inline` falls
// back to a toast. On a load, every reason currently renders the full-page
// error; the `redirect` kind stays available for future per-page needs.
export const MERCHANT_FAILURE_PRESENTATION: Record<
  MerchantCommandFailureReason,
  { action: FailurePresentation; load: MerchantLoadPresentation }
> = {
  invalid: { action: 'inline', load: 'page' },
  conflict: { action: 'inline', load: 'page' },
  forbidden: { action: 'inline', load: 'page' },
  'not-found': { action: 'inline', load: 'page' },
  network: { action: 'inline', load: 'page' },
  server: { action: 'inline', load: 'page' },
  unknown: { action: 'inline', load: 'page' },
};

// Resolve a primary-load failure to its load directive. This only returns the
// directive; the page acts on it (navigate, render error). It never navigates
// or touches stores.
export function resolveMerchantLoadFailure(
  failure: MerchantCommandFailure,
): MerchantLoadPresentation {
  return MERCHANT_FAILURE_PRESENTATION[failure.reason].load;
}

// One entry point for every merchant failure, form or not. Field errors (or an
// `inline` reason) go on the form; everything else is global feedback. Pages
// that need a reason-specific reaction (navigate, refresh) handle that reason
// before calling this.
export function handleMerchantFailure<
  E extends object = Record<string, string>,
>(
  failure: MerchantCommandFailure & { fieldErrors?: E },
  deps: { form?: FormErrorSink<E> } = {},
): void {
  const { form } = deps;
  const kind = MERCHANT_FAILURE_PRESENTATION[failure.reason].action;

  if (form && (hasFieldErrors(failure.fieldErrors) || kind === 'inline')) {
    applyFormFailure(form, failure);
    return;
  }

  presentFeedback(kind, failure.message);
}
