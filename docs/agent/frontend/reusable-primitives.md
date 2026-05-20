# Frontend Reusable Primitives

Use this before adding frontend helpers, shared hooks, utilities, or app-level
VMs.

For reusable UI components, use
`docs/agent/frontend/shared-components.md`.

## App-Level VMs

Use app-level VMs for global app behavior.

- App context: `apps/web/src/app/viewModel/useAppContextVM.ts`
- Auth: `apps/web/src/app/viewModel/useAuthVM.ts`
- Feedback VM: `apps/web/src/app/viewModel/feedback.vm.ts`
- Feedback hook: `apps/web/src/app/viewModel/useFeedbackVM.ts`
- Language: `apps/web/src/app/viewModel/useLanguageVM.ts`

Do not put page-specific behavior in app-level VMs.

## Shared Hooks

Use shared hooks for generic reusable React state behavior.

- Cursor pagination: `apps/web/src/shared/hooks/useCursorPaginationQuery.ts`
- Debounce: `apps/web/src/shared/hooks/useDebouncedValue.ts`
- Offset pagination: `apps/web/src/shared/hooks/useOffsetPaginationQuery.ts`
- Throttle: `apps/web/src/shared/hooks/useThrottle.ts`

Shared hooks must not call services, APIs, page commands, toast, navigation, or
domain stores directly.

## Shared Utils

Use shared utils for project-generic pure helpers.

- Class names: `apps/web/src/shared/utils/cn.ts`

Keep domain-specific helpers in `apps/web/src/models`, the owning feature, or
the owning page.
