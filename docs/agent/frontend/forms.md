# Frontend Forms

Use this guide when adding or changing frontend forms.

## Default

Do not install a form library by default.

Follow the frontend architecture command flow in `docs/agent/frontend/architecture.md`.

Use a page-local form hook for form state, including small starter forms such as login and register.

Example:

```txt
src/pages/login/
  LoginPage.tsx
  useLoginPageVM.ts
  useLoginForm.ts
  loginPage.commands.ts
```

## State Ownership

Place form state by ownership and sharing scope.

Use the page-local form hook for page-only form values and submit state.

Examples:

- login form values
- register form values
- one-page editor draft values
- page-only field errors
- page-only submit errors
- page-only submit/loading state

Use feature stores when the same form state instance must be shared across components or pages, preserved after leaving the page, reset by feature actions, or treated as feature state.

Examples:

- feature filter, sort, or view mode shared by multiple components
- editor draft values shared across components or pages
- table column visibility for one feature

Put feature-owned form state in `src/features/<domain>/<slice>/store.ts`.

Put feature-owned form setters and resets in `src/features/<domain>/<slice>/actions.ts`.

The page-local form hook may use React `useState` or `useReducer`.

Use React `useState` inside a component only for component-local UI state that does not belong to the page form.

Examples:

- dropdown open state
- password visibility toggle
- combobox search text that only filters local menu options

## Submit Flow

Keep form submit responsibilities split between the page VM and commands.

The page VM owns:

- read page-local form values
- validate current form values before submit commands run
- set page-local field and submit errors
- call commands
- handle redirect, toast, modal, and form reset outcomes

Before calling commands, validate the current form values. Prefer shared API contract schemas for request validation and normalization. If validation fails, set page-local field and submit errors, then return without calling commands, services, or APIs.

Keep page-only validation in the VM, such as `confirmPassword` matching. Do not send page-only fields to commands, services, or APIs.

Field errors and submit errors are user-facing text. Build them with the app i18n helper, such as `tDefault(...)`, before storing them in page-local form state. Map schema or library validation issues to app i18n messages, and do not show raw validation-library messages such as `issue.message` in the UI.

The commands file owns:

- call services
- map API errors
- call feature actions when a submit result should update feature store state
- return typed page outcomes to the VM

The page VM connects the local form hook to commands.

Return submit handlers as stable top-level VM fields. Do not hide them under an unstable `actions` object.

Example:

```ts
function useLoginPageVM() {
  const form = useLoginForm();

  async function submit() {
    const validation = validateLoginForm(form.values);

    if (!validation.success) {
      form.setFieldErrors(validation.fieldErrors);
      form.setSubmitError(
        tDefault(
          'auth.validation.submitInvalid',
          'Check the highlighted fields and try again.',
        ),
      );
      return;
    }

    const result = await loginPageCommands.submit(validation.request);

    if (result.status === 'authenticated') {
      form.reset();
      return;
    }

    form.setFieldErrors(result.fieldErrors ?? {});
    form.setSubmitError(result.message);
  }

  return {
    form,
    submit,
  };
}
```

## Field Errors

Use an object keyed by field name for field-level errors.

Example:

```ts
type LoginFieldErrors = Partial<Record<'email' | 'password', string>>;
```

Use an empty object when there are no field errors.

Use a separate `submitError: string | null` for form-level errors.

Do not put form-level errors inside the field error object.

## Editing Forms

For edit pages, keep confirmed data and unsaved draft data separate.

Use a feature store for data loaded from the backend.

Use the page-local form hook for draft values the user has not saved yet.

On save:

- pass the page-local draft values to the command
- call the service
- update the feature store with the saved result
- reset or realign the page-local draft state after success

## Shared Components

Use shared `Field` wrappers with shadcn UI primitives.

```tsx
<Field label="Email" error={vm.form.fieldErrors.email}>
  <Input
    value={vm.form.values.email}
    onChange={(event) => vm.form.setField('email', event.target.value)}
  />
</Field>
```

Shared form components live in `src/shared/components/form`.

For reusable domain form components, placement, and colocated component form
hooks, follow `docs/agent/frontend/shared-components.md`.

shadcn primitives live in `src/shared/components/ui`.

Do not use shadcn `Form`, `FormField`, `FormItem`, `FormControl`, or `FormMessage` by default. They do not match this app's page VM and page-local form hook baseline.

## Boundaries

Shared form components should not:

- own form state
- call services
- call feature stores directly
- run submit commands
- know page VM shape
- encode business validation rules

For general view, store, and model boundaries, follow `docs/agent/frontend/architecture.md`.
