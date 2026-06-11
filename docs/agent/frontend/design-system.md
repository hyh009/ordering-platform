# Frontend Design System

Use this guide when making UI decisions.

## UI Baseline

- This app uses Tailwind CSS and shadcn/ui.
- shadcn primitives live in `src/shared/components/ui`.
- shadcn primitives are local source files copied into the repo, not runtime
  imports from a `shadcn/ui` component package.
- The current button primitive uses Base UI under the hood via
  `@base-ui/react/button`; keep app-specific styling in the local shadcn wrapper
  and variant files.
- Shared app-level UI lives in `src/shared/components`.
- Feature-specific UI lives in `src/features/<area>/<resource>/components` or
  `src/features/<area>/components`.
- Page-only UI lives beside the page in `src/pages/<pageName>`.

## Tokens

Theme tokens are defined in `src/styles/global.css` under `:root`, `.dark`, and `@theme inline`.

- Primary color: use `--primary` / `--primary-foreground`.
- Secondary color: use `--secondary` / `--secondary-foreground`.
- Muted surfaces and helper text: use `--muted` / `--muted-foreground`.
- Destructive state: use `--destructive`.
- Font: use the app `font-sans` token.
- Radius: use the shadcn radius tokens.
- Overlay z-index layers: use semantic utilities from `src/styles/global.css`,
  such as `z-page-modal`, `z-feedback-modal`, and `z-feedback-toast`.

Prefer theme tokens over hard-coded colors in shared UI.
When adding new colors, spacing, radius values, or overlay layers, first check
whether an existing Tailwind, shadcn, or app token can be reused.

Do not hard-code numeric z-index utilities such as `z-50` or `z-[100]` in
components. Add or reuse a semantic overlay layer utility in `global.css`
instead.

## Type And Spacing

- Keep font sizes stable across viewport widths.
- Use shadcn component sizing for controls before inventing custom sizes.
- Use consistent padding and margin from Tailwind spacing utilities.
- Keep compact app surfaces tighter than marketing pages.

## Responsive

Use Tailwind's mobile-first breakpoints:

- `sm`: 40rem / 640px
- `md`: 48rem / 768px
- `lg`: 64rem / 1024px
- `xl`: 80rem / 1280px
- `2xl`: 96rem / 1536px

Start with the mobile layout, then add breakpoint variants only where the layout needs to change.

## Guest Layout

The guest ordering flow uses `GuestLayout`, which centers the page at
`max-w-(--guest-layout-max-w)` (defined in `global.css`). Individual guest pages
must **not** re-apply narrow `max-w-*` constraints on every inner section.

**Rule:** Use a single content wrapper with the desired `max-w-*`, then let
children fill it with `w-full`, `flex-1`, or `grid`. Never scatter `max-w-sm`
(or any fixed-width `max-w`) across sibling sections — it defeats the responsive
container and creates fixed-width islands inside a fluid layout.

```tsx
{/* ✅ one wrapper, children fill with grid/flex */}
<div className="flex flex-1 flex-col items-center px-4 md:px-8">
  <div className="w-full max-w-2xl">
    <div className="grid grid-cols-2 gap-3">
      <button className="...">...</button>   {/* grows with the grid */}
      <button className="...">...</button>
    </div>
    <div className="mt-4 flex gap-3">
      <Button className="flex-1">A</Button>  {/* fills half by flex */}
      <Button className="flex-1">B</Button>
    </div>
  </div>
</div>

{/* ❌ wrong — fixed-width islands */}
<div className="mt-7 w-full max-w-sm">...</div>
<div className="mt-4 flex w-full max-w-sm gap-3">...</div>
```

Use `px-4 md:px-8` on the outer flex column for edge padding, not on each
section individually.

## Page Layout

Every admin and merchant page uses the `admin-page-content` utility as the outermost
wrapper. It is defined in `src/styles/global.css` and provides a full-width grid
container with consistent padding and gap:

```css
@utility admin-page-content {
  display: grid;
  gap: 1.5rem;
  padding: var(--admin-page-padding);  /* 2rem */
  width: 100%;
}
```

Do not replace `admin-page-content` with hand-rolled padding or `max-w-*` wrappers.
If content needs a narrower column (e.g. a form), apply `max-w-2xl` to the inner
element, not the page wrapper.

### Page header

Every page that has a title uses this header block as the first child of
`admin-page-content`:

```tsx
<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
  <div>
    <h1 className="mb-3 text-3xl leading-tight font-bold md:text-4xl">
      {tDefault('namespace.page.title', 'Page Title')}
    </h1>
    <p className="max-w-2xl text-base text-muted-foreground">
      {tDefault('namespace.page.description', 'One-line page description.')}
    </p>
  </div>
  {canManage ? <Button>{tDefault('…', 'Create …')}</Button> : null}
</div>
```

- The action button is conditional on `canManage` (see Permission gating in
  `docs/features/permissions.md`).
- Omit the description paragraph only when there is genuinely nothing useful to
  say; do not omit the h1 header.

### Inline error alert

Use this pattern for page-level API load errors and mutation errors:

```tsx
{error ? (
  <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
    {error}
  </p>
) : null}
```

Do not use bare `text-destructive` without the border and background.

## Component Rules

- When creating a reusable control primitive such as Input, Select, or Popover,
  follow `docs/agent/frontend/how-to-create-ui-control.md`.
- Prefer shadcn primitives for buttons, inputs, dialogs, dropdowns, tabs, menus, checkboxes, switches, toasts, and form controls.
- Wrap primitives in shared or feature components when behavior becomes app-specific.
- Do not put business rules, API calls, feature store access, or layout ownership inside shadcn primitives.

## Global CSS Boundaries

Use `src/styles/global.css` only for:

- Tailwind imports
- shadcn theme tokens
- CSS variables
- base styles for `html`, `body`, `*`
- light/dark theme definitions

Do not put page-specific or component-specific classes in global CSS.

Avoid global classes like:

- `.todo-row`
- `.app-header`
- `.primary-button`
- `.modal-panel`

Prefer Tailwind utilities and shadcn components inside React components.
