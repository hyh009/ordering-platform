# Frontend Architecture

Use this guide as the frontend architecture entry point.

For detailed decisions, use the focused guides listed in `Related Docs`. Use
`docs/agent/frontend/code-placement.md` for the quick "what goes where" map.

## Flow

This project uses React + Zustand with a lightweight MVVM-inspired architecture.

Command flow:

```txt
View -> Page VM Hook -> Commands -> Service -> API
                         |
                         v
                   Feature Actions -> Feature Store
                   when the flow owns resource state
```

State flow:

```txt
Feature Store -> Page VM Hook via useStore(...) -> View re-renders
Page VM local state / form hook -> Page VM Hook -> View re-renders
```

## Core Rules

- Pages live in `src/pages`. Platform pages are grouped into platform subfolders. Cross-platform pages such as `login` and `notFound` stay at `src/pages/` root.
- Features are based on reusable business capability, not route pages.
- App-wide runtime modules live under `src/app/global/<module>`.
- Feature stores and feature actions live under
  `src/features/<area>/<resource>/<slice>` when the feature uses resource
  slices.
- Zustand stores hold state only.
- Feature actions only mutate store state.
- Commands compose async flows, validate request boundaries, and call
  services/actions.
- Views use page VM hooks and do not call commands or stores directly.
- Page VM hooks own React lifecycle, page-local state, command-result
  reactions, and view-ready handlers.
- Use camelCase for folders and normal module names.

## Pages

Pages are route/view-based.

Put page-specific files together:

- page component
- page VM hook
- page commands, when the page selects, wraps, or overrides feature commands
- page-local form hooks

Page folders are private to their route. Do not import VM hooks, form hooks,
types, commands, components, or helpers from another page folder. If page code
needs to be shared, move it to the owner that matches the behavior.

Page VM hooks return stable top-level handlers, not nested `actions` objects.
Use `useCallback` or `useMemo` when returned handlers or objects are used in
dependency arrays or memoized children.

## Features

Feature folders own reusable business logic, resource flows, and API-loaded
resource state.

Common feature folders:

```txt
src/features/<businessArea>/
  <resource>/
    list/
      actions.ts
      commands.ts
      runtime.ts
      store.ts
    detail/
      actions.ts
      commands.ts
      runtime.ts
      store.ts
    mutations/
      commands.ts
    components/
```

Use `<businessArea>` for the frontend capability area, such as `menu`,
`metadata`, or `organizationManagement`. Use `<resource>` for the collection
being operated on, such as `productModifiers`, `categories`, or
`organizations`. Use slices such as `list`, `detail`, and `mutations` for the
read model or write flow.

For small domains, a feature may omit the `<resource>` level and keep the slice
directly under `<businessArea>`:

```txt
src/features/<businessArea>/
  <slice>/
    actions.ts
    commands.ts
    runtime.ts
    store.ts
  components/
```

Do not split create, update, and delete into separate feature slices by
default. Put standard collection writes in `mutations/commands.ts`. Let page VMs
decide whether success should reload list state, reload detail state, close a
modal, or navigate.

Use feature stores for API-loaded resource state, including list data, detail
data, loading state, and API load errors. The store does not have to be shared
across pages; runtime wiring decides whether the store instance is page-local
or shared.

Use `list/` for list read state and list loading commands. Use `detail/` for
full-resource read state and detail loading commands.

Keep page-only UI process state in the page VM or page-local hooks, such as
modal open state, edit mode, selected tabs, command-result reactions,
navigation, toast, and confirmation flow. Keep form drafts, field errors, and
submit state in the form hook or page VM unless the draft itself is intentionally
feature-owned.

Feature folders should not contain page folders.

Feature runtimes wire store/action/command instances and define instance scope.
A runtime created inside one page VM is page-local even though the state lives
in a feature store file. Follow `docs/agent/frontend/commands.md` for runtime
wiring and command ownership.

Domain reusable form hooks or pure form mappers may live beside their reusable
domain form component under
`src/features/<area>/<resource>/components/<componentName>` or
`src/features/<area>/components/<componentName>` when multiple pages in that
domain need the same form shape. The page VM still owns the hook instance and
submit flow.

Colocated domain form hooks are component form contracts, not feature-level page
VMs. Do not put route lifecycle, command execution, navigation, or modal
reactions in them.

## Services And Models

Use root-level `src/services` for service modules.

Services call `apiJson` and convert backend responses into frontend models.
Services should not own UI flow, mutate stores, or catch API errors for display.

Use root-level `src/models` for frontend model types and pure DTO conversion
helpers.

Any domain may use a domain folder when that keeps model-boundary files easier
to scan. Use `docs/agent/frontend/code-placement.md` for the file placement map.

```txt
src/models/<domain>/
  types.ts
  model.ts
  display.ts        # optional
  requestMapper.ts  # optional
  formMapper.ts     # optional
  index.ts
```

Keep DTO conversion functions in model mapper files. Start with `model.ts` for
DTO-to-model conversion; add focused mapper files such as `requestMapper.ts` or
`formMapper.ts` only when the direction or caller makes the split clearer.

Import domain model APIs through `@/models/<domain>` instead of reaching into
private files from pages, features, or services.

Raw API DTOs should not leak into pages, commands, actions, stores, or views.

Base API client behavior and endpoint paths stay in `src/api`.

## Components

Place components by ownership:

- App shell, route guards, and error boundaries go in `src/app`.
- Page-only components stay in the page's folder under `src/pages`.
- Domain reusable components go in
  `src/features/<area>/<resource>/components` or
  `src/features/<area>/components`.
- Project-generic reusable components go in `src/shared/components`.

Do not put domain-specific components in `src/shared/components`.

When a domain component has private supporting hooks or helpers, colocate them
under that component folder:

```txt
src/features/<area>/<resource>/components/<componentName>/
  <ComponentName>.tsx
  use<ComponentName>Form.ts
```

## Related Docs

- `docs/agent/frontend/architecture-diagram.md` for the quick folder and flow map.
- `docs/agent/frontend/architecture-validation.md` for boundary checks before finishing.
- `docs/agent/frontend/code-placement.md` for the quick code placement map.
- `docs/agent/frontend/state-ownership.md` for app/global vs feature vs page vs component state.
- `docs/agent/frontend/commands.md` for page commands, feature commands, wrappers, overrides, and runtime wiring.
- `docs/agent/frontend/forms.md` for page-local form state and submit flow.
- `docs/agent/frontend/shared-components.md` for component ownership and shared import rules.
- `docs/agent/frontend/reusable-primitives.md` for shared hooks, helpers, utilities, and app-wide runtime modules.
- `docs/agent/frontend/error-feedback.md` for API error mapping and inline error state.
