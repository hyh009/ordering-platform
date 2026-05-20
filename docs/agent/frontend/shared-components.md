# Frontend Shared Components

Use this guide before adding, moving, or reusing frontend UI components.

For shared hooks, helpers, utilities, or app-level VMs, use
`docs/agent/frontend/reusable-primitives.md`.

## Component Lookup

Before creating a component, check the existing component layers:

- `apps/web/src/shared/components/ui` for shadcn primitives.
- `apps/web/src/shared/components` for app-level reusable UI.
- `apps/web/src/features/<domain>/components` for reusable domain UI.
- `apps/web/src/pages/<pageName>` for page-only UI.

Prefer reusing or extending the smallest existing component that already owns
the same behavior.

## Shared Component Decision

Before implementing new UI, decide whether it should become a shared component.

Create or update a shared component when:

- the same UI is needed by more than one page or feature
- the UI represents app-level behavior, such as feedback, layout, or form chrome
- the API is generic enough to express behavior through props
- sharing it removes meaningful duplication without adding domain assumptions

Keep the component feature-owned or page-owned when:

- it contains domain language or domain rules
- it depends on one page flow
- reuse is only speculative
- only the visual shell is similar

Ask the user before creating a shared component when ownership is ambiguous,
reuse is speculative, or the shared API would force naming or behavior choices
that are not already clear.

## Placement Rules

- Put app-level reusable UI in `src/shared/components`.
- Put reusable domain UI in `src/features/<domain>/components`.
- Keep page-only UI beside the page in `src/pages/<pageName>`.
- Keep shadcn primitive wrappers in `src/shared/components/ui`.
- Do not put domain-specific components in `src/shared/components`.
- Do not move a component to shared only because it is visually similar.

## Shared Component Boundaries

Shared components may own:

- presentation structure
- control composition
- local UI-only state
- accessibility wiring
- generic empty, loading, or confirmation UI

Shared components must not own:

- API calls
- page commands
- feature actions
- Zustand store access
- route navigation
- business validation rules

Pass behavior in through props from the page VM or feature component.

## Before Finishing

- Check whether a new component duplicates an existing shared, feature, or page component.
- Check whether a new shared component contains domain language, domain data assumptions, or page flow behavior.
- If two places need the same UI, first decide whether the shared ownership is app-level or domain-level.
- Follow `docs/agent/frontend/design-system.md` for shadcn and styling rules.
