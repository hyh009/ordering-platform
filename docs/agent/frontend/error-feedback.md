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
  (`handle<Area>Failure`), not by calling `feedbackCommands.toast` / `alert`
  directly in the VM. Direct feedback calls are only for non-failure UX such as
  confirmations and outcome dialogs.
- Feature stores hold feature-owned page/domain error state only; feature
  actions only mutate that state.

## Presentation convention

A failure's `reason` decides how it is shown. Keep this as a per-area table
(`reason → presentation`) consumed by one entry helper, so every page surfaces
failures the same way and a new reason must declare its presentation.

Each frontend area has its own table + helper — do not share one across areas
(their reason sets differ). Place each at
`apps/web/src/pages/<area>/<area>FailureFeedback.ts` and name the helper
`handle<Area>Failure(failure, { form? })`. When adding one for a new area,
mirror an existing area's implementation.

The four presentation kinds:

- `inline` — on the form that triggered it (form-level submit error)
- `toast` — transient; the page stays usable
- `modal` — the user must acknowledge before continuing
- `silent` — a control-flow signal with no user-facing message

The area's table (`<AREA>_FAILURE_PRESENTATION`) maps each reason to a kind, and
its helper resolves in this order:

```txt
field errors present?  ──▶ put on fields, clear submit error   (see forms.md)
else the reason's kind:
  inline (with a form)  ──▶ form submit error
  inline (no form)      ──▶ fall back to toast (never drop the message)
  modal                 ──▶ acknowledge dialog
  toast                 ──▶ transient toast
  silent                ──▶ nothing
```

Call it from the VM once a command returns a failure:

```ts
// page with no form — let the convention decide
if (result.status === 'failed') handleAreaFailure(result);

// page with a form — route field/inline errors onto it
handleAreaFailure(result, { form: { setSubmitError } });
```

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
