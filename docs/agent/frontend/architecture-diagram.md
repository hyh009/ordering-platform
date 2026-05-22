# Frontend Architecture Diagram

Quick reference for frontend work.

## Command Flow

```txt
React View
  |
  | calls stable VM handlers
  v
Page VM Hook
  |
  | owns route effects and UI reactions
  v
Commands
  |
  +--> Service --> API Client / Paths --> Backend API
  |
  v
Feature Actions
  |
  v
Feature Store
```

## State Flow

```txt
Feature Store
  |
  v
Page VM Hook via useStore(...)
  |
  v
React View re-renders
```

## Placement

```txt
Page view + page VM hook
  -> src/pages/<pageName>

Page-only commands
  -> src/pages/<pageName>

App-wide runtime modules
  -> src/app/global/<module>

App shell layouts and project-specific app header
  -> src/app/layout

App route guards
  -> src/app/routing

App and route error boundaries
  -> src/app/error

Feature-level state
  -> src/features/<domain>/<slice>/store.ts

Feature slice async flows
  -> src/features/<domain>/<slice>/commands.ts

Feature store/action runtime
  -> src/features/<domain>/<slice>/runtime.ts

Command/runtime ownership details
  -> docs/agent/frontend/commands.md

Page-only form hook and process/UI state
  -> src/pages/<pageName>/use<PageName>PageVM.ts
  -> src/pages/<pageName>/use<PageName>Form.ts

Reusable domain form view + form hook
  -> src/features/<domain>/components/<domainForm>/

Page async flow
  -> src/pages/<pageName>/<pageName>Page.commands.ts

Feature state mutations
  -> src/features/<domain>/<slice>/actions.ts

Domain shared components
  -> src/features/<domain>/components

Project shared components
  -> src/shared/components

Generic reusable hooks
  -> src/shared/hooks

Frontend models/types
  -> src/models

Services
  -> src/services

API client and paths
  -> src/api

Static assets
  -> src/assets
```

## Folder Map

```txt
src/
  api/
    index.ts
    paths/

  app/
    error/
    global/
      auth/
      feedback/
      appContext/
    i18n/
    layout/
    routing/

  assets/
  models/
  services/

  pages/
    <pageName>/
      <PageName>Page.tsx
      use<PageName>PageVM.ts
      <pageName>Page.commands.ts

  features/
    <domain>/
      <slice>/
        actions.ts
        commands.ts
        runtime.ts
        store.ts
      components/
        <domainForm>/
          <DomainForm>.tsx
          use<Domain>Form.ts

  shared/
    components/
    hooks/
    utils/
```

Use camelCase for folders, such as `todoOverview`, `todoDetail`, and `appContext`.

`store` / `stores` folders contain `*.store.ts` files only.

Use `src/app/global/<module>` only for app-wide runtime modules such as auth, feedback, and app context.

`*.commands.ts` files do not use React hooks, toast/modal APIs, or navigation APIs.

Follow `docs/agent/frontend/commands.md` for page-owned vs feature-owned commands,
shared command contracts, overrides, and runtime wiring.

Page VM hooks return stable top-level handlers. Avoid `vm.actions` objects unless they are memoized.
