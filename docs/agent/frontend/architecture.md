# Frontend Architecture

Use this guide as the frontend architecture entry point.

For detailed decisions, use the focused guides listed in `Related Docs`.

## Flow

This project uses React + Zustand with a lightweight MVVM-inspired architecture.

Command flow:

```txt
View -> Page VM Hook -> Commands -> Feature Actions -> Feature Store
                         |
                         v
                       Service -> API
```

State flow:

```txt
Feature Store -> Page VM Hook via useStore(...) -> View re-renders
```

## Core Rules

- Pages live in `src/pages`.
- Features are based on domain, not page.
- App-wide runtime modules live under `src/app/global/<module>`.
- Feature stores and feature actions live under `src/features/<domain>`.
- Zustand stores hold state only.
- Feature actions only mutate store state.
- Commands compose async flows and call services/actions.
- Views use page VM hooks and do not call commands or stores directly.
- Page VM hooks own React lifecycle, page-local state, command-result
  reactions, and view-ready handlers.
- Use camelCase for folders and normal module names.

## Pages

Pages are route/view-based.

Put page-specific files together:

- page component
- page VM hook
- page commands, only when the async flow is page-owned
- page-local form hooks

Page folders are private to their route. Do not import VM hooks, form hooks,
types, commands, components, or helpers from another page folder. If page code
needs to be shared, move it to the owner that matches the behavior.

Page VM hooks return stable top-level handlers, not nested `actions` objects.
Use `useCallback` or `useMemo` when returned handlers or objects are used in
dependency arrays or memoized children.

## Features

Feature folders own reusable domain logic and state transitions.

Common feature folders:

```txt
src/features/<domain>/
  <slice>/
    actions.ts
    commands.ts
    runtime.ts
    store.ts
  components/
```

Feature folders should not contain page folders.

Feature runtimes may wire feature store/action instances when pages need
page-local feature state. Follow `docs/agent/frontend/commands.md` for runtime
wiring and command ownership.

Domain reusable form hooks or pure form mappers may live beside their reusable
domain form component under `src/features/<domain>/components/<componentName>`
when multiple pages in that domain need the same form shape. The page VM still
owns the hook instance and submit flow.

Colocated domain form hooks are component form contracts, not feature-level page
VMs. Do not put route lifecycle, command execution, navigation, or modal
reactions in them.

## Services And Models

Use root-level `src/services` for service modules.

Services call `apiJson` and convert backend responses into frontend models.
Services should not own UI flow, mutate stores, or catch API errors for display.

Use root-level `src/models` for frontend model types and pure DTO conversion
helpers.

Raw API DTOs should not leak into pages, commands, actions, stores, or views.

Base API client behavior and endpoint paths stay in `src/api`.

## Components

Place components by ownership:

- App shell, route guards, and error boundaries go in `src/app`.
- Page-only components stay in `src/pages/<pageName>`.
- Domain reusable components go in `src/features/<domain>/components`.
- Project-generic reusable components go in `src/shared/components`.

Do not put domain-specific components in `src/shared/components`.

When a domain component has private supporting hooks or helpers, colocate them
under that component folder:

```txt
src/features/<domain>/components/<componentName>/
  <ComponentName>.tsx
  use<ComponentName>Form.ts
```

## Related Docs

- `docs/agent/frontend/architecture-diagram.md` for the quick folder and flow map.
- `docs/agent/frontend/architecture-validation.md` for boundary checks before finishing.
- `docs/agent/frontend/state-ownership.md` for app/global vs feature vs page vs component state.
- `docs/agent/frontend/commands.md` for page commands, feature commands, wrappers, overrides, and runtime wiring.
- `docs/agent/frontend/forms.md` for page-local form state and submit flow.
- `docs/agent/frontend/shared-components.md` for component ownership and shared import rules.
- `docs/agent/frontend/reusable-primitives.md` for shared hooks, helpers, utilities, and app-wide runtime modules.
- `docs/agent/frontend/error-feedback.md` for API error mapping and inline error state.
