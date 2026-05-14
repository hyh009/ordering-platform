# Frontend Architecture Validation

Use this checklist before finishing frontend code changes.

## Check Flow

Confirm the implementation follows:

```txt
View -> Page VM Hook -> Page Commands -> Feature Actions -> Feature Store
                         |
                         v
                       Service -> API
```

## View Checks

- Views call page VM hooks and render returned values.
- Views do not call page commands directly.
- Views do not call stores directly.
- Views do not inspect command results for navigation, toast, modal, or form reset decisions.
- Views do not put the whole `vm` object in hook dependency arrays.
- If a view effect needs a VM handler, depend on the stable handler only.

## VM Checks

- Page VM hooks own route lifecycle effects, such as detail-page initial loads.
- Page VM hooks own command-result reactions, such as navigation after delete succeeds.
- Page VM hooks expose top-level handlers, not nested `actions` objects.
- Returned handlers used in effects or memoized children are stable.
- Page-local form and UI state stays in the VM or page-local form hook.
- VM hooks do not pass raw API DTOs to views.

## Commands Checks

- Page commands do not use React hooks.
- Page commands do not call toast, modal, or navigation APIs.
- Page commands call services and feature actions.
- Page commands return typed page results.
- Page commands map API errors with named helpers when behavior depends on error meaning.

## Feature Checks

- Feature actions only mutate stores.
- Feature actions do not call services.
- Stores contain state only.
- Store state uses frontend models, not raw API DTOs.

## Common Failure Patterns

- `useEffect(..., [vm])`
- `useEffect(..., [vm.actions])`
- View code doing `await commandOrVMAction(); navigate(...)` without checking a typed result in the VM.
- `*.commands.ts` importing React, router APIs, or feedback UI APIs.
- Feature actions importing services.
