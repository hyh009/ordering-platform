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

Use this folder shape for feature resources:

```txt
src/features/<businessArea>/
  <resource>/
    <readSlice>/   # optional: list/detail/overview/etc.
      actions.ts
      commands.ts
      runtime.ts
      store.ts
    mutations/     # optional: create/update/delete writes
      commands.ts
    components/    # optional: reusable domain UI
```

Folder names:

- `<businessArea>` is the frontend capability area, such as `menu`,
  `metadata`, or `organizationManagement`.
- `<resource>` is the collection being operated on, such as
  `productModifiers`, `categories`, `tags`, or `allergens`.
- Not every resource needs every slice. Add only the slices that resource has.

Slices:

- Read slices are named by read-model type. `list/`, `detail/`, and
  `overview/` are common examples, not the full set.
- `list/` is for collection item read models. These usually load only the
  fields needed by table rows, filters, ordering, or picker options.
- `detail/` is for single-resource read models. These load the fields needed by
  the detail page or edit UI.
- `overview/` is for aggregate or dashboard read models, such as active counts,
  status totals, or region breakdowns.
- `mutations/` is for standard collection writes: create, update, delete,
  reorder, archive, restore, and similar API writes.
- `components/` is for reusable domain UI, form views, field groups, and
  component-owned form contracts.

Rules:

- Keep API-loaded read-slice state in feature stores: data, loading flags, and
  API load errors.
- Keep store mutations in `actions.ts`; stores hold state only.
- Put read flows in `<readSlice>/commands.ts` and standard write flows in
  `mutations/commands.ts`.
- Let page commands or page VMs handle API-after side effects, such as reloading
  list/detail state, closing a modal, showing toast, or navigating.
- Follow `docs/agent/frontend/commands.md` for command placement, runtime
  wiring, and command ownership.

Keep page-only UI process state in the page VM or page-local hooks, such as
modal open state, edit mode, selected tabs, command-result reactions,
navigation, toast, and confirmation flow. Keep form drafts, field errors, and
submit state in the form hook or page VM unless the draft itself is intentionally
feature-owned.

Feature folders should not contain page folders.

Feature runtimes wire store/action instances and define instance scope. A
runtime created inside one page VM is page-local even though the state lives in
a feature store file. Export a shared feature runtime only when multiple pages
need the same live state.

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
