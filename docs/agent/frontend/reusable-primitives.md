# Frontend Reusable Primitives

Use this before adding frontend helpers, shared hooks, utilities, or app-wide
runtime modules.

For reusable UI components, use
`docs/agent/frontend/shared-components.md`.

## App-Wide Runtime Modules

Use app-wide runtime modules for global app behavior.

- App context: `apps/web/src/app/global/appContext`
- Auth: `apps/web/src/app/global/auth`
- Feedback commands and hook: `apps/web/src/app/global/feedback`
- Language VM: `apps/web/src/app/i18n/useLanguageVM.ts`

Do not put page-specific behavior in app-wide runtime modules.

Use `apps/web/src/app/global/<module>` only for app-wide runtime state and
flows, such as auth, feedback, app context, current organization, or theme.

## Shared Hooks

Use shared hooks for generic reusable React state behavior.

- Debounce: `apps/web/src/shared/hooks/useDebouncedValue.ts`
- Cursor pagination: `apps/web/src/shared/hooks/useCursorPaginationQuery.ts`
- Offset pagination: `apps/web/src/shared/hooks/useOffsetPaginationQuery.ts`
- Throttle: `apps/web/src/shared/hooks/useThrottle.ts`

Shared hooks must not call services, APIs, page commands, toast, navigation, or
domain stores directly.

## Shared Utils

Use shared utils for project-generic pure helpers.

- Class names: `apps/web/src/shared/utils/cn.ts`

Keep domain-specific helpers in `apps/web/src/models`, the owning feature, or
the owning page.
