# Frontend Architecture

Use this guide when adding or updating frontend code.

## Goal

This project uses React + Zustand with a lightweight MVVM-inspired architecture.

Command flow:

```txt
View -> Page VM Hook -> Page Commands -> Feature Actions -> Feature Store
                         |
                         v
                       Service -> API
```

State flow:

```txt
Feature Store -> Page VM Hook via useStore(...) -> View re-renders
```

## Core Rules

- Pages live in `src/pages`.
- Each page folder contains the page view, page VM hook, and page commands.
- Features are based on domain, not page.
- App-wide runtime modules live under `src/app/global/<module>`.
- Feature stores and feature actions live under `src/features/<domain>`.
- Zustand stores hold state only.
- Feature actions only mutate store state.
- Page commands compose async page flows and call services/actions.
- Components never call `store.getState()` or `store.setState()` directly.
- Components use page VM hooks to read state and trigger VM handlers.
- Page VM hooks own route lifecycle effects and command-result reactions.
- Page VM hooks expose stable top-level handlers, not nested action objects.
- Global app modules only contain app-wide runtime state and flows.
- Use camelCase for folder names and normal module names.

## Folder Structure

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
    todoOverview/
      TodoOverviewPage.tsx
      useTodoOverviewPageVM.ts
      todoOverviewPage.commands.ts
    todoDetail/
      TodoDetailPage.tsx
      useTodoDetailPageVM.ts
      todoDetailPage.commands.ts

  features/
    todo/
      actions/
      components/
      store/

  shared/
    components/
    hooks/
    utils/
```

## Page Layer

Pages are route/view-based.

Put page-specific files together:

- page component
- page VM hook
- page commands

Example:

```txt
src/pages/todoOverview/
  TodoOverviewPage.tsx
  useTodoOverviewPageVM.ts
  todoOverviewPage.commands.ts
```

The page VM hook is the React adapter.

It owns:

- React hooks
- `useStore` subscriptions
- route param lifecycle effects such as initial detail-page loads
- page-local form and UI state
- validation
- toast, modal, navigation, and form reset reactions
- view-ready values and handlers

Views call the page VM hook and render returned values.

Views may pass route params or navigation callbacks into the VM hook.

Views should not:

- call page commands directly
- inspect command results to decide navigation or feedback
- depend on grouped objects such as `vm.actions` in `useEffect`

Return stable top-level handlers from the VM hook:

```ts
return {
  deleteTodo,
  form,
  loadTodo,
  saveTodo,
  setField,
  todo,
};
```

Use `useCallback` or `useMemo` when a returned handler/object is used in a dependency array or passed to memoized children.

The page commands file is the testable async page flow layer.

It owns:

- call services
- call feature actions
- map API errors into typed page results
- return typed results to the page VM hook

Page commands do not use React hooks, toast/modal APIs, navigation APIs, or local UI state.

When touching an existing `*.workflow.ts` page file, migrate it to `*.commands.ts`.

## Feature Layer

Features are domain-based.

Feature folders own reusable domain logic and state transitions:

```txt
src/features/todo/
  actions/
  components/
  store/
```

Feature folders should not contain page folders.

## State Categories

App-level global state is used across multiple pages or features and belongs to the application runtime.

Place app-wide runtime modules in `src/app/global/<module>`.

Examples:

- auth session, current user, authentication status, and access token
- app feedback such as toast and confirm modal state
- current organization or app context
- global theme

Do not use `src/app/global` as a generic shared folder.

Do not put page-specific state, domain feature state, or generic utilities in `src/app/global`.

App-level global modules may contain their own store, actions, commands, and VM hook files:

```txt
src/app/global/auth/
  auth.store.ts
  auth.actions.ts
  auth.commands.ts
  useAuthVM.ts

src/app/global/feedback/
  feedback.store.ts
  feedback.commands.ts
  useFeedbackVM.ts
```

Feature-level state belongs to one domain feature and needs feature ownership or shared access.

Place feature-level store files in `src/features/<domain>/store`.

Examples:

- todo overview list
- todo detail state
- editor draft state shared across components or pages
- dashboard filters shared by multiple components

For form values, field errors, and submit state, follow `docs/agent/frontend/forms.md`.

Page-only process/UI state belongs in the page VM hook.

Use React `useState` in the page VM hook.

Examples:

- redirect outcomes
- page-only computed flags
- page-only non-form process state

Page-only form state belongs in a page-local form hook; follow `docs/agent/frontend/forms.md`.

UI-level state is local to one component.

Use React `useState`.

Examples:

- modal open / close
- dropdown state
- hover state
- password visibility toggle
- combobox search text that only filters local menu options

Do not put UI-level state in Zustand.

## Store

Stores hold state only.

Store folders contain only `*.store.ts` files.

Do not put VM, actions, hooks, services, API calls, or page command logic in `store` / `stores`.

Feature-level stores should usually export factory functions, so feature/page state is not accidentally global.

## Actions

Actions only mutate store state.

Feature actions belong in `src/features/<domain>/actions`.

Feature actions should usually be created with factory functions that receive a feature store instance.

Actions may call:

- `store.getState()`
- `store.setState()`

Actions should not keep hidden internal state.

Actions should not call services, handle API errors, show feedback, navigate, or coordinate page flows.

## Services

Use root-level `src/services` for service modules.

Services handle domain/app calls and external integrations.

Services call `apiJson` and convert between API DTOs and frontend models.

- On read: deserialize API DTOs into frontend models with helpers from `src/models`.
- On write: serialize frontend models or input into API request payloads with helpers from `src/models`.
- Pages, commands, actions, and stores should not handle raw API DTOs directly.

Base API client and endpoint paths stay in `src/api`.

## Models

Use root-level `src/models` for frontend model/type definitions.

Backend models are centralized under `apps/api/src/models`.

Do not put model/type files inside feature folders.

Model files may contain pure helpers for API DTO conversion and computed values:

- deserialize API DTOs into frontend models
- serialize frontend models into API request payloads
- compute display labels or other derived values

Stores should keep frontend models, not raw API DTOs.

## Components

Place components by ownership:

- App shell layouts and project-specific app header: `src/app/layout`
- App route guards: `src/app/routing`
- App and route error boundaries: `src/app/error`
- Page-only components: `src/pages/<pageName>`
- Same domain, multiple pages: `src/features/<domain>/components`
- Project-level reusable: `src/shared/components`

Do not put domain-specific components in `shared/components`.

## Shared Hooks

`src/shared/hooks` is only for generic reusable hooks that can be used across projects.

Examples:

- `useDebouncedValue`
- `useThrottle`

Do not put page VM hooks or domain-specific hooks in `shared/hooks`.

## Naming

Use camelCase for folders and normal module names.

Examples:

- `todoOverview`
- `todoDetail`
- `appContext`
- `todoOverview.store.ts`
- `todoDetail.actions.ts`
- `todoOverviewPage.commands.ts`

React component files and component exports use PascalCase.
