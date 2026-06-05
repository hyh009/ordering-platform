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
