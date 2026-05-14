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
Page Commands
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
Page view + page VM hook + page commands
  -> src/pages/<pageName>

App-level state
  -> src/app/stores

Feature-level state
  -> src/features/<domain>/store

Page-only form hook and process/UI state
  -> src/pages/<pageName>/use<PageName>PageVM.ts
  -> src/pages/<pageName>/use<PageName>Form.ts

Testable page async flow
  -> src/pages/<pageName>/<pageName>Page.commands.ts

Feature state mutations
  -> src/features/<domain>/actions

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
    stores/
    viewModel/

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
      actions/
      components/
      store/

  shared/
    components/
    hooks/
    utils/
```

Use camelCase for folders, such as `todoOverview`, `todoDetail`, and `viewModel`.

`store` / `stores` folders contain `*.store.ts` files only.

`*.commands.ts` files do not use React hooks, toast/modal APIs, or navigation APIs.

Page VM hooks return stable top-level handlers. Avoid `vm.actions` objects unless they are memoized.
