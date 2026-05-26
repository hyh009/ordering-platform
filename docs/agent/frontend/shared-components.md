# Frontend Shared Components

Use this guide before adding, moving, or reusing frontend UI components.

For shared hooks, helpers, utilities, or app-wide runtime modules, use
`docs/agent/frontend/reusable-primitives.md`.

## Component Lookup

Before creating a component, check the existing component layers:

- `apps/web/src/shared/components/ui` for shadcn primitives.
- `apps/web/src/app/layout` for the app shell, app header, and layout adapters.
- `apps/web/src/app/routing` for route guards.
- `apps/web/src/app/error` for app and route error boundaries.
- `apps/web/src/shared/components` for project-level reusable UI.
- `apps/web/src/features/<domain>/components` for reusable domain UI.
- `apps/web/src/pages/<pageName>` for page-only UI.

Prefer reusing or extending the smallest existing component that already owns
the same behavior.

## Shared Component Decision

Before implementing new UI, decide whether it should become a shared component.

Create or update a shared component when:

- the same UI is needed by more than one page or feature
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

- Put app-level shared components in the owning `src/app/<area>` folder when
  they are reused by app shell, routing, error, i18n, or global runtime code.
- Put app shell UI, such as the app header and shell layout, in `src/app/layout`.
- Put app route guards in `src/app/routing`.
- Put app and route error boundaries in `src/app/error`.
- Put project-level reusable UI in `src/shared/components`.
- Put shared feedback hosts in `src/shared/components/feedback`.
- Put reusable domain UI in `src/features/<domain>/components`.
- Keep page-only UI beside the page in `src/pages/<pageName>`.
- Keep shadcn primitive wrappers in `src/shared/components/ui`.
- Do not put domain-specific components in `src/shared/components`.
- Do not move a component to shared only because it is visually similar.

For reusable domain form UI, colocate the form view and component-specific form
hook under the domain component folder:

```txt
src/features/<domain>/components/<domainForm>/
  <DomainForm>.tsx
  use<Domain>Form.ts
```

The colocated hook defines the form contract consumed by the component. It is
not a page VM and should not own commands, routing, modal lifecycle, or feature
store subscriptions.

App-level shared components are shared inside the app runtime, not across the
project as generic UI. Keep them in `src/app` when they know about routing,
global app state, i18n setup, or app shell behavior.

## Shared Ownership And Imports

Page folders are private to their route. Do not import VM hooks, form hooks,
types, commands, components, or helpers from another page folder.

If two or more pages need the same code, extract one shared owner and update all
imports to use that owner. Do not keep compatibility re-exports from the old
page folder.

Choose the owner by behavior:

- `src/features/<domain>` for domain-specific reusable UI, hooks, commands, or helpers.
- `src/shared` for project-generic UI, hooks, or helpers.
- `src/models` or `src/models/<domain>` for model types, request/response
  mapping, and pure model helpers.
- `src/services` for API-backed domain calls.

## Shared Component Boundaries

Shared components may own:

- presentation structure
- control composition
- local UI-only state
- accessibility wiring
- generic empty, loading, or confirmation UI
- component-specific form field wiring when the form state contract is passed in
  through props

Shared components must not own:

- API calls
- commands
- feature actions
- Zustand store access
- route navigation
- business validation rules

Pass behavior in through props from the page VM or feature component.

## Before Finishing

- Check whether a new component duplicates an existing shared, feature, or page component.
- Check whether a new shared component contains domain language, domain data assumptions, or page flow behavior.
- If two places need the same UI, first decide whether the shared ownership is app layout, project-level, domain-level, or page-level.
- When extracting shared code, verify every existing import now points at the new owner.
- Follow `docs/agent/frontend/design-system.md` for shadcn and styling rules.
