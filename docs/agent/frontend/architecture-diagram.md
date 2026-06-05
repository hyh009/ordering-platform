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
  +--> Feature Actions --> Feature Store
       (when the flow updates API-loaded resource state)
```

## State Flow

```txt
Feature Store                    Page-local state / form hook
  |                              |
  v                              v
Page VM Hook via useStore(...)   Page VM Hook
  |
  v
React View re-renders
```

## State Sources

```txt
Backend API business resources
  -> organizations, stores, menu resources, metadata resources
  -> feature list/detail stores

App runtime context
  -> auth/current session, active organization, active store, global feedback
  -> may be loaded from API, but owned by the app shell/session
  -> src/app/global/<module>

Route and page interaction
  -> route params, search params, modal state, edit mode, selected tab
  -> page VM hook

Form interaction
  -> draft values, field errors, submit state
  -> page-local or reusable domain form hook

Static app data
  -> i18n resources, constants, static assets
  -> app, models, shared, or assets owner
```

## Placement

```txt
Page view + page VM hook
  -> src/pages/<platform>/<pageName>  (admin or merchant)
  -> src/pages/<pageName>             (cross-platform: login, notFound)

Page-only commands
  -> src/pages/<platform>/<pageName>  (admin or merchant)
  -> src/pages/<pageName>             (cross-platform: login, notFound)

App-wide runtime modules
  -> src/app/global/<module>

App shell layouts and project-specific app header
  -> src/app/layout

App route guards
  -> src/app/routing

App and route error boundaries
  -> src/app/error

Feature resource state
  -> src/features/<area>/<resource>/<slice>/store.ts

Feature read async flows
  -> src/features/<area>/<resource>/list/commands.ts
  -> src/features/<area>/<resource>/detail/commands.ts

Feature mutation async flows
  -> src/features/<area>/<resource>/mutations/commands.ts

Feature store/action runtime
  -> src/features/<area>/<resource>/<slice>/runtime.ts

Command/runtime ownership details
  -> docs/agent/frontend/commands.md

Page-only form hook and process/UI state
  -> src/pages/<platform>/<pageName>/use<PageName>PageVM.ts
  -> src/pages/<platform>/<pageName>/use<PageName>Form.ts

Reusable domain form view + form hook
  -> src/features/<area>/<resource>/components/<domainForm>/

Page async flow
  -> src/pages/<platform>/<pageName>/<pageName>Page.commands.ts

Feature state mutations
  -> src/features/<area>/<resource>/<slice>/actions.ts

Domain shared components
  -> src/features/<area>/<resource>/components
  -> src/features/<area>/components

Project shared components
  -> src/shared/components

Generic reusable hooks
  -> src/shared/hooks

Frontend models/types
  -> src/models
  -> src/models/<domain> when using a domain model folder

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
    <domain>/
      types.ts
      model.ts
      requestMapper.ts  # optional
      formMapper.ts     # optional
      index.ts
  services/

  pages/
    admin/
      <pageName>/
    merchant/
      <pageName>/
    login/           # cross-platform
    notFound/        # cross-platform

  features/
    <area>/
      <resource>/
        list/
          actions.ts
          commands.ts
          runtime.ts  # feature slice wiring factory
          store.ts
        detail/
          actions.ts
          commands.ts
          runtime.ts  # feature slice wiring factory
          store.ts
        mutations/
          commands.ts
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

Feature slice `runtime.ts` files live with the feature slice because they wire
that slice's store and actions. Page VMs call the feature runtime; they should
not define feature store/action wiring inline.

List and detail runtimes default to factory functions that page VMs instantiate
for page-local state. Export a shared runtime instance only when a concrete UI
flow needs cross-page state.

Use `src/app/global/<module>` only for app-wide runtime modules such as auth, feedback, and app context.

`*.commands.ts` files do not use React hooks, toast/modal APIs, or navigation APIs.

Follow `docs/agent/frontend/commands.md` for page-owned vs feature-owned commands,
shared command contracts, overrides, and runtime wiring.

Page VM hooks return stable top-level handlers. Avoid `vm.actions` objects unless they are memoized.
