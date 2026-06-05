# How To Create UI Control

Use this guide when adding a reusable control primitive such as an input,
select, popover, dialog, dropdown, checkbox, switch, textarea, or button.

## Goal

Keep control primitives consistent with this app's shadcn-based local source
setup:

- shadcn CLI/config is used to copy component source into this repo.
- Runtime primitives can come from Base UI, Radix, or plain HTML depending on
  the generated component, but do not import UI components from a `shadcn/ui`
  runtime package.
- Local control wrappers live in `apps/web/src/shared/components/ui`.
- App-specific composition lives outside the primitive wrapper.

## Before Creating

1. Check `apps/web/src/shared/components/ui` for an existing primitive.
2. Check `apps/web/components.json` before using the shadcn CLI.
3. Check `docs/agent/frontend/design-system.md` for token and styling rules.
4. Check `docs/agent/frontend/shared-components.md` if the component might be a
   shared app, feature, or page component instead of a primitive.

Do not create a new control primitive only because one page needs custom layout
or domain behavior. Wrap an existing primitive in a page, feature, or shared
component instead.

## Create Or Update The Primitive

Use the shadcn CLI from the web app package when the component exists in the
registry:

```bash
pnpm --filter web exec shadcn add <component>
```

Examples:

```bash
pnpm --filter web exec shadcn add input
pnpm --filter web exec shadcn add select
pnpm --filter web exec shadcn add popover
```

After generation:

- Keep generated files under `apps/web/src/shared/components/ui`.
- Keep imports aligned with the aliases in `apps/web/components.json`.
- Keep shared utilities imported from `@/shared/utils`, especially `cn`.
- Keep theme styling based on `src/styles/global.css` tokens.
- Split non-component variant helpers, such as `buttonVariants`, into a
  separate file if exporting them from the component file would violate React
  refresh lint rules.

If the CLI generates files into `apps/web/@` or another unexpected directory,
stop and fix alias configuration before editing the generated code.

## Primitive Rules

Control primitives may own:

- accessibility wiring required by the primitive
- Tailwind classes and shadcn token usage
- variant and size definitions
- generic local UI state needed by the control itself
- light adapters over Base UI, Radix, or native HTML APIs

Control primitives must not own:

- API calls
- page commands
- feature store access
- route navigation
- business validation rules
- domain-specific labels, statuses, or option construction
- form submit behavior

Pass app behavior in through props from the page VM, feature component, or form
wrapper.

## Base UI And Select-Like Controls

This project currently uses Base UI under some local control wrappers,
including Button, Input, and Select.

When adding select-like controls:

- Follow the generated Base UI component API rather than Radix examples if the
  generated primitive imports from `@base-ui/react`.
- Keep option data mapping outside the primitive unless the primitive is already
  intentionally designed around a generic `options` prop.
- Preserve empty-value handling explicitly when Base UI uses `null` internally
  and app forms use an empty string.

Do not mix Base UI and Radix APIs inside the same primitive unless the generated
component already does so and there is a clear compatibility reason.

## When To Wrap

Create a wrapper outside `src/shared/components/ui` when behavior becomes
app-specific:

- Use `src/shared/components` for project-generic reusable UI.
- Use `src/features/<area>/<resource>/components` or
  `src/features/<area>/components` for reusable domain UI.
- Use `src/pages/<pageName>` for page-only UI.

Examples:

- A generic `Select` primitive belongs in `src/shared/components/ui`.
- An organization owner picker belongs in a feature or page folder.
- A labeled form field composition should use shared form components, not add
  label/error ownership to every primitive.

## Searchable Selects

Use `src/shared/components/form/SearchableSelect.tsx` for reusable searchable
select controls. Follow `docs/agent/frontend/searchable-select.md` before
changing searchable select behavior.

Keep API calls, debounce, cursor state, and option append/replace logic in the
page VM or feature hook.

The component should receive controlled state and intent callbacks:

- `searchValue`
- `options`
- `isLoading`
- `isLoadingMore`
- `hasMore`
- `onSearchChange`
- `onLoadMore`
- `onValueChange`

Do not add searchable or async loading props to the shadcn Select primitive in
`src/shared/components/ui/select.tsx`.

## Before Finishing

Run the narrow verification for frontend control changes:

```bash
pnpm --filter web run build:app
```

Also check:

- imports point to the new owner
- no page or domain behavior leaked into the primitive
- no hard-coded theme colors were added when a token exists
- `components.json` aliases still match the generated paths
