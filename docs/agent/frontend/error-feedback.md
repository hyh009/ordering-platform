# Frontend Error Feedback

Once a command returns a typed failure `{ status: 'failed', reason, message }`,
this guide decides how to surface it and where error state lives.

- To produce that failure (code → reason → message), see
  `docs/agent/frontend/error-mapping.md`.
- For the toast / modal / confirm APIs, see
  `docs/agent/frontend/shared-feedback-ui.md`.
- For form field error shape and ownership, see
  `docs/agent/frontend/forms.md`.

## Core rules

- Do not create a global error store.
- Presentation (toast / modal / inline / silent) is decided at the page or VM
  layer — never in API, services, mappers, feature actions, or stores.
- Surface a command failure through the area's failure helper
  (`handle<Area>Failure`), not by calling `feedbackCommands.toast` / `alert` or
  `form.setFieldErrors` / `setSubmitError` directly in the VM. Direct feedback or
  form-error calls are only for non-failure UX (confirm / outcome dialogs) or
  pages not in such an area (e.g. login).
- Feature stores hold feature-owned page/domain error state only; feature
  actions only mutate that state.

## Purely client-side errors

Errors that never reach a command — canvas crop, clipboard write, file read —
have no API `reason` and no area failure table. Surface them through
`presentClientError(message, kind)` in
`apps/web/src/app/global/feedback/presentClientError.ts` (`kind` defaults to
`toast`, pass `'modal'` to make the user acknowledge). This is the only
sanctioned reason a shared hook may reach the global feedback runtime.

If a purely client-side error fits neither toast nor modal, discuss the
approach with the user before building it.

## Presentation convention

A failure's `reason` decides how it is shown, via a `reason → presentation`
table, so every page surfaces failures the same way and a new reason must
declare its presentation.

A failure surfaces in one of two contexts, so the table value has two axes. The
discriminator is whether the page already shows its primary data, not whether the
trigger was a "refresh":

- `action` — a command result while the page already shows its data and stays
  usable (a mutation, a refresh, a submit). Kinds: `inline | toast | modal |
  silent`.
- `load` — the outcome of a page's primary-resource (route/init) load, before any
  data is on screen. Kinds: `page | redirect | silent`; see "Page-load failures"
  below.

```ts
{ action: 'toast', load: 'page' } // storefront table value
```

An area whose pages have no primary-resource load may use a bare `action` kind
instead of the object.

Each frontend area supplies its own table plus a thin `handle<Area>Failure`
wrapper that routes by the resolved `action` kind, keeping form display and
global feedback in separate layers:

- failures that belong on a form (field errors, or an `inline` reason) go to
  `applyFormFailure` in `apps/web/src/shared/components/form/formFailure.ts`
- everything else goes to `presentFeedback` (toast / modal / silent) in
  `apps/web/src/app/global/feedback/presentFeedback.ts`, which never touches form
  state

Do not reimplement this routing per VM, and do not share one table across areas
— their reason sets differ, and the same reason can map to a different kind per
area (e.g. `invalid` is inline on a form-heavy area, toast elsewhere).

Place each area's table + wrapper at
`apps/web/src/pages/<area>/<area>FailureFeedback.ts`.

The four action kinds:

- `inline` — the form-level submit message, shown inline on the form (a per-field
  error is not this kind; field errors are separate and always take precedence)
- `toast` — transient; the page stays usable
- `modal` — the user must acknowledge before continuing
- `silent` — a control-flow signal with no user-facing message

The area's table (`<AREA>_FAILURE_PRESENTATION`) maps each reason to its kinds.
The `handle<Area>Failure` wrapper reads `.action` and resolves in this order:

```txt
field errors present (with a form)?  ──▶ put on fields, clear submit error   (applyFormFailure)
inline (with a form)                 ──▶ form submit error                   (applyFormFailure)
inline (no form)                     ──▶ fall back to toast (never dropped)   (presentFeedback)
modal                                ──▶ acknowledge dialog                  (presentFeedback)
toast                                ──▶ transient toast                     (presentFeedback)
silent                               ──▶ nothing                             (presentFeedback)
```

Call it from the VM once a command returns a failure:

```ts
// page with no form — let the convention decide
if (result.status === 'failed') handleAreaFailure(result);

// page with a form — pass the form's error setters (setFieldErrors optional)
handleAreaFailure(result, {
  form: { setSubmitError: form.setSubmitError, setFieldErrors: form.setFieldErrors },
});
```

The helper and `applyFormFailure` only set the current failure's errors; they do
not clear stale ones. Clear errors at submit start in the VM with
`form.resetErrors()` (see `docs/agent/frontend/forms.md`), so a previous submit's
field errors do not linger when this attempt fails with a non-field failure.

Only call the helper for `result.status === 'failed'`. Non-failure terminal
outcomes (such as an `ended` status) are not failures — handle those directly,
not through the helper.

Pages that need a reason-specific reaction (navigate, clear session) handle that
reason before delegating to the helper.

## Page-load failures

When a page's primary-resource load (its route/init load) fails before any data
is on screen, surface it with the `load` axis, not a toast — a transient toast
over a blank page is the wrong affordance. Two helpers consume the `load` axis:

- `handle<Area>LoadFailure(failure, { onRedirect, onPageError })` — the load-axis
  sibling of `handle<Area>Failure`. It reads the directive and applies it through
  page-injected callbacks, so VMs do not hand-roll the `redirect`/`page`/`silent`
  switch. `onPageError` is optional: omit it when the page's load command already
  wrote the error into its store; pass it when the page must place the error
  itself (see "Where error state lives").
- `resolve<Area>LoadFailure(failure)` — the lower-level form that only returns the
  directive, for a page that needs custom branching.

Both only return or route the directive; neither navigates nor touches stores —
the page injects those, because the target and the error's home are page-specific.

The three load kinds:

- `page` — render the area's shared full-page error view with a retry action.
- `redirect` — the session is unusable here (auth gone, stale route); the page
  sends the user away. The directive only says "redirect"; the page picks the
  target (e.g. landing vs history) and any side effect (clear session), because
  those are page-specific. Do not put navigation in the helper.
- `silent` — a benign race (another navigation is taking over); do nothing.

The error view and loading view are shared, presentational, and header-less —
each page composes its own page header around them, so the page title stays the
page's own (the error view adds no title of its own). For storefront:
`StorefrontErrorView` (illustration + message + retry) and `StorefrontLoadingView`
(spinner), in `apps/web/src/features/storeFront/components/`.

Retry re-runs the page's init load (a soft re-run, not `window.location.reload()`)
so SPA state is preserved.

VM shape (for `result.status === 'failed'` on the init/load path):

```ts
handleStorefrontLoadFailure(result, {
  // navigate to this page's own target; clear session if the reason needs it
  onRedirect: () =>
    navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId), { replace: true }),
  // place the message where this page reads its load error (store or VM — see
  // "Where error state lives"); omit entirely when the load command already wrote
  // the store error
  onPageError: reportLoadFailure,
});
```

The page renders, in its content area: loading → `StorefrontLoadingView`; load
error → `StorefrontErrorView` with `onRetry`; otherwise the page body.

## Where error state lives

Use page-local form state for page-only field and submit errors; follow
`docs/agent/frontend/forms.md`.

Use feature store state for feature-owned errors that belong to current page
data:

- list load failed
- detail item not found
- save failed while the form stays open

### An error lives with the `{ data, isLoading }` it belongs to

`{ data, isLoading, error }` is one load state machine, and the load command
transitions all three together. So a load error belongs wherever its `data` and
`isLoading` already live:

- If this page renders a feature store's load state as its content, the error
  belongs in **that store** — the default. The load command writes
  `data`/`isLoading`/`error` atomically; splitting `error` into the VM would
  fragment one state machine across two owners.
- A load failure that is **not part of any store's loadable state** is page-flow:
  keep it in the **page VM**. This is the escape hatch, not the default — if
  several errors drift into VMs, the usual cause is a store that should have
  owned them.

"Belongs to" is relative to what *this* page is doing: the same failure can be a
store error on one page and page-flow on another. Example: the storefront menu
loads store+menu into the storefront store, so that load error lives in the
store; a parallel `resumeSession` failure that only gates the open menu is not
part of that store's triple (and `resumeSession` is store-agnostic — it writes no
store), so it lives in the menu VM. Meanwhile the cart page *does* render the
cart store's load state, so the same `resumeSession` failure is a cart-store
error there.

This governs only *where the error string is held*. The decision of what to do
about it (navigate / block / render) is always the VM's, via the `load`
directive — independent of where the string lives.

Feature-owned store error state may start simple:

```ts
type PageError = string | null;
```

Use a structured error only when the UI needs code or details:

```ts
type PageError = {
  message: string;
  code?: string;
  details?: unknown[];
};
```
