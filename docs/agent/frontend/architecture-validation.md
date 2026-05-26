# Frontend Architecture Validation

Use this checklist before finishing frontend code changes.

## Check Flow

Confirm the implementation follows:

```txt
View -> Page VM Hook -> Commands -> Feature Actions -> Feature Store
                         |
                         v
                       Service -> API
```

## View Checks

- Views call page VM hooks and render returned values.
- Views do not call commands directly.
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
- VM hooks do not create feature stores and actions directly; use feature runtime factories for store/action wiring, then create page-owned commands from the returned actions.

## Page Boundary Checks

- Page files do not import from other page folders; shared code is moved to the correct feature, shared, model, or service owner.
- Extracted shared code has one owner, and every existing import points to that owner.
- Pages, features, and services import domain model APIs from
  `@/models/<domain>` when a domain model folder exists, not from private
  model subfiles.

## Commands Checks

- Commands do not use React hooks.
- Commands do not call toast, modal, or navigation APIs.
- Commands call services and feature actions.
- Commands return typed results.
- Commands map API errors with named helpers when behavior depends on error meaning.
- Feature commands do not import from `src/pages`.

## Feature Checks

- Feature actions only mutate stores.
- Feature actions do not call services.
- Stores contain state only.
- Store state uses frontend models, not raw API DTOs.

## Model Checks

- Shared HTTP DTO types are imported from `@repo/shared` at the model boundary.
- DTO conversion functions live in model mapper files under `src/models` or
  `src/models/<domain>`.
- Raw API DTOs do not leak past services into commands, actions, stores, VMs,
  or views.

## Common Failure Patterns

- `useEffect(..., [vm])`
- `useEffect(..., [vm.actions])`
- View code doing `await commandOrVMAction(); navigate(...)` without checking a typed result in the VM.
- `*.commands.ts` importing React, router APIs, feedback UI APIs, or page modules from feature code.
- Page code importing anything from another page folder, including VM hooks, form hooks, types, commands, components, or helpers.
- Feature actions importing services.
