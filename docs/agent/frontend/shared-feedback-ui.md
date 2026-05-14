# Shared Feedback UI

Use this guide when adding toast, modal, or confirm feedback behavior.

## Goal

Keep feedback UI reusable while keeping this app's active feedback instance in `src/app`.

Toast and modal feedback may be used for errors, success messages, confirmations, or blocking user decisions.

## Flow

```txt
Page VM Hook
  -> feedback VM
  -> feedback store
  -> shared feedback host renders
```

## Core Rules

- Toast and modal state belongs to `src/app`, not `src/shared`.
- `src/shared` owns reusable UI components.
- `src/app` owns this application's active toast and modal instance.
- Page VM hooks may call app-level feedback VM methods.
- API, service, feature action, and feature store files do not call toast or modal APIs.
- Do not use feedback UI as a global error store.

## Placement

```txt
src/
  app/
    stores/
      feedback.store.ts
    viewModel/
      feedback.vm.ts

  shared/
    components/
      feedback/
        ModalHost.tsx
        ToastHost.tsx
```

## Allowed

```txt
Page VM Hook -> feedback VM -> feedback store -> shared host renders
```

## Not Allowed

```txt
API client -> toast/modal
Service -> toast/modal
Feature action -> toast/modal
Feature store -> toast/modal
```

## Toasts

Use toast when the message is temporary and does not require a decision.

Examples:

- save succeeded
- delete failed
- network request failed but the page can stay usable

## Modals

Use modal when the user must confirm, choose, or acknowledge a blocking condition.

Examples:

- destructive action confirmation
- unsaved changes confirmation
- conflict that needs a user decision

## Confirm Modals

Prefer an async confirm API for user decisions:

```ts
const confirmed = await feedback.confirm({
  title: 'Delete todo?',
  message: 'This action cannot be undone.',
  confirmLabel: 'Delete',
});
```

Rules:

- Keep callbacks only while the modal is open.
- Clear callbacks when the modal closes.
- Do not store callbacks in domain feature stores.
- Do not pass UI callbacks through services.
