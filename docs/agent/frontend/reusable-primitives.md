# Frontend Reusable Primitives

Use this before adding frontend helpers, shared hooks, utilities, or app-wide
runtime modules.

For reusable UI components, use
`docs/agent/frontend/shared-components.md`.

For reusable marker and generated registry rules, use
`docs/agent/frontend/reusable-registry.md`.

## Shared Types

Import public API contracts from `@repo/shared` when they are already shared
between API and Web.

Use root-level `apps/web/src/models` for frontend model types, web-only API
types, and pure DTO conversion helpers that map shared DTOs into frontend
models.

When adding or extracting a reusable type, search for existing inline shapes
before finishing. Use the new type name, old field names, and representative
field pairs as keywords.

Examples:

- For offset pagination types, search for `limit`, `offset`,
  `limit offset`, and the new type name.
- For cursor pagination types, search for `cursor`, `nextCursor`,
  `cursor limit`, and the new type name.

Replace matching inline shapes when they represent the same contract. Keep
inline types when the shape is page-only, has different semantics, or would
create a misleading shared contract.

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

- Cursor pagination controls: `apps/web/src/shared/hooks/useCursorPaginationControls.ts`
- Debounce: `apps/web/src/shared/hooks/useDebouncedValue.ts`
- Offset pagination controls: `apps/web/src/shared/hooks/useOffsetPaginationControls.ts`
- Throttle: `apps/web/src/shared/hooks/useThrottle.ts`

Shared hooks must not call services, APIs, commands, toast, navigation, or
domain stores directly.

For pagination-specific guidance, use
`docs/agent/frontend/pagination.md`.

## Shared Utils

Use shared utils for project-generic pure helpers.

- Class names: `apps/web/src/shared/utils/cn.ts`
- Cursor pagination: `apps/web/src/shared/utils/cursorPagination.ts`
- Offset pagination: `apps/web/src/shared/utils/offsetPagination.ts`

Keep domain-specific helpers in `apps/web/src/models`, the owning feature, or
the owning page.
