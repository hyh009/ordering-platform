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

Put feature-owned form state in `src/features/<domain>/store`.

Put feature-owned form setters and resets in `src/features/<domain>/actions`.

The page-local form hook may use React `useState` or `useReducer`.

Use React `useState` inside a component only for component-local UI state that does not belong to the page form.

Examples:

- dropdown open state
- password visibility toggle
- combobox search text that only filters local menu options

## Submit Flow

Keep form submit responsibilities split between the page VM and page commands.

The page VM owns:

- read page-local form values
- run page/form validation
- set page-local field and submit errors
- call page commands
- handle redirect, toast, modal, and form reset outcomes

The page commands file owns:

- call services
- map API errors
- call feature actions when a submit result should update feature store state
- return typed page outcomes to the VM

The page VM connects the local form hook to the page commands.

Return submit handlers as stable top-level VM fields. Do not hide them under an unstable `actions` object.

Example:

```ts
function useLoginPageVM() {
  const form = useLoginForm();

  async function submit() {
    if (!form.validate()) {
      return;
    }

    const result = await loginPageCommands.submit(form.values);

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

- pass the page-local draft values to the page command
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
