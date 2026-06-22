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

Each frontend area supplies its own table plus a thin `handle<Area>Failure`
wrapper that routes by the resolved kind, keeping form display and global
feedback in separate layers:

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

The four presentation kinds:

- `inline` — the form-level submit message, shown inline on the form (a per-field
  error is not this kind; field errors are separate and always take precedence)
- `toast` — transient; the page stays usable
- `modal` — the user must acknowledge before continuing
- `silent` — a control-flow signal with no user-facing message

The area's table (`<AREA>_FAILURE_PRESENTATION`) maps each reason to a kind. The
wrapper resolves in this order:

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

## Where error state lives

Use page-local form state for page-only field and submit errors; follow
`docs/agent/frontend/forms.md`.

Use feature store state for feature-owned errors that belong to current page
data:

- list load failed
- detail item not found
- save failed while the form stays open

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
