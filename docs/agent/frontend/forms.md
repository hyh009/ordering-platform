# Frontend Forms

Use this guide when adding or changing frontend forms.

## Default

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

Do not add a feature-owned form store by default. Use a feature store only when
the same form state instance must be shared across components or pages,
preserved after leaving the page, reset by feature actions, or treated as
feature state.

Examples:

- feature filter, sort, or view mode shared by multiple components
- editor draft values shared across components or pages
- table column visibility for one feature

When a form truly needs feature-owned state, follow
`docs/agent/frontend/state-ownership.md`: put the state in
`src/features/<area>/<resource>/<slice>/store.ts` and put setters or resets in
`src/features/<area>/<resource>/<slice>/actions.ts`.

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
- convert form values into request input
- run page-only or UX validation when needed
- set page-local field and submit errors
- call commands
- handle redirect, toast, modal, and form reset outcomes

Commands own request boundary validation. A submit or mutation command that
receives `CreateXRequest`, `UpdateXRequest`, or similar request input must run
the matching shared or domain schema before calling the service. If validation
fails, the command returns a typed failure with field errors; the VM writes those
errors into page-local form state.

Keep page-only validation in the VM or form hook, such as `confirmPassword`
matching, touched-field feedback, or local draft constraints that are not part
of the API request. Do not send page-only fields to commands, services, or APIs.

Field errors and submit errors are user-facing text. Build them with the app i18n helper, such as `tDefault(...)`, before storing them in page-local form state. Map schema or library validation issues to app i18n messages, and do not show raw validation-library messages such as `issue.message` in the UI.

The commands file owns:

- validate request input before service calls
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
    const request = toLoginRequest(form.values);
    const result = await loginPageCommands.submit(request);

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

When a submit result includes both field errors and a generic submit error,
render the field errors as the primary feedback. Show the generic submit error
only when there are no field errors, such as network, server, permission, or
other non-field failures.

## Editing Forms

For edit pages, keep confirmed data and unsaved draft data separate.

Use a feature store for data loaded from the backend.

Use the page-local form hook for draft values the user has not saved yet.

On save:

- pass the page-local draft values to the command
- call the service
- reload or update confirmed feature state after success
- reset or realign the page-local draft state after success

## Form Labels And Options

Keep form labels, option labels, and helper text user-facing and localized.

Use domain model `display.ts` helpers for domain-owned labels, such as enum
option labels, translated option labels, locale labels, and localized text
fallback helpers.

Examples:

```txt
src/models/store/display.ts
src/models/metadata/display.ts
```

Components import these helpers through `@/models/<domain>`, not from the
private `display.ts` file.

Keep component-local labels in the component only when they are page-specific
and not reusable across the domain.

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

## Form Error Helpers

For reusable domain form components, colocate a `{formName}Errors.ts` file in the form folder.

This file owns:

- Field error type definitions
- Zod issue → i18n field error message mapping for the form fields
- Optional UX validation helpers for page-only fields or immediate form feedback

Example:

```txt
src/features/organization/components/organizationForm/
  OrganizationForm.tsx
  useOrganizationForm.ts
  organizationFormErrors.ts

src/features/organization/membership/components/addMemberForm/
  AddMemberForm.tsx
  useAddMemberForm.ts
  addMemberFormErrors.ts
```

The command calls the schema and returns typed validation failures. The page VM
handles the result:

```ts
const result = await commands.addMember(organizationId, request);

if (result.status === 'failed') {
  form.setFieldErrors(result.fieldErrors ?? {});
  form.setSubmitError(result.message);
}
```

The VM may call form-level validation before commands only for UX-only or
page-only fields. Request schemas that protect service/API calls belong in the
command.

## Boundaries

Shared form components should not:

- own form state
- call services
- call feature stores directly
- run submit commands
- know page VM shape
- encode submit request boundary validation

For general view, store, and model boundaries, follow `docs/agent/frontend/architecture.md`.
