# Frontend Feature Development

Use this guide when adding or changing frontend behavior in `apps/web`.

## Goal

When adding or changing a frontend feature:

1. Map backend data through model boundaries before using it in the UI.
2. Keep the architecture flow: View → Page VM → Commands → Feature Actions → Store | Service → API.
3. Localize every user-facing string.
4. Follow the checklist in order.

## Checklist

Every step must be reviewed. Not every step requires changes — record the
outcome (changed, no change needed, or not applicable) before moving on.

### 1. Shared contracts

Determine whether the feature introduces or changes an API request or response
shape. If yes, add or update types and Zod schemas in `packages/shared` before
writing any frontend code.

Follow `docs/agent/workflows/shared-contracts.md`.

### 2. Models

Determine whether the feature reads or writes backend data. If yes, add or
update the domain model boundary in `apps/web/src/models/<domain>/`.

- Keep DTO conversion in `model.ts`.
- Keep domain UI display helpers (enum labels, translated option labels,
  localized text fallback) in `display.ts`.
- Keep raw API DTOs out of pages, commands, actions, stores, and views.
- Export through `apps/web/src/models/<domain>/index.ts`; pages, features, and
  services import through `@/models/<domain>`.

Follow `docs/agent/frontend/architecture.md` (Model Boundaries section).

### 3. Services

Determine whether the feature calls backend APIs. If yes, add or update the
domain service in `apps/web/src/services`.

- Add endpoint paths under `apps/web/src/api/paths`.
- Services call `apiJson` and use `src/models` helpers for DTO
  deserialize/serialize.
- Let `apiJson` throw `ApiError`; do not catch API errors in services.

Follow `docs/agent/frontend/error-feedback.md` when mapping API errors.

### 4. State

Determine whether the feature loads business resource data from an API. If yes,
add or update a feature store in
`apps/web/src/features/<area>/<resource>/<slice>`.

- Use `src/app/global/<module>` for app/session/runtime state such as auth,
  active organization, active store, and global feedback.
- Use feature stores for API-loaded resource state such as list data, detail
  data, loading flags, and API load errors. The store does not need to be shared
  across pages.
- Keep store mutations in `actions.ts`; stores hold state only.
- Add a feature runtime to wire store/action instances; runtime wiring decides
  whether the instance is page-local or shared.
- Use page VM state for page-only process state, route lifecycle, and
  page-owned form or control state.
- Use form hooks or page VM state for form drafts, field errors, and submit
  state unless the draft itself is intentionally feature-owned.
- List slices own list loading state. Detail slices own full-resource loading
  state.

Follow `docs/agent/frontend/state-ownership.md`.

### 5. Commands

Determine whether the feature has async flows. If yes, add or update commands.

- Page commands live with the page under `apps/web/src/pages/<page>/`.
- Page VMs call page commands for page-owned async flows; keep the wrapper even
  when it only forwards to a feature command.
- Feature read commands live under
  `apps/web/src/features/<area>/<resource>/list/` or
  `apps/web/src/features/<area>/<resource>/detail/`.
- Standard create, update, and delete flows for one resource collection live in
  `apps/web/src/features/<area>/<resource>/mutations/commands.ts`.
- Commands coordinate request validation, service calls, actions, loading
  states, API errors, and typed outcomes.
- Page VMs decide mutation success reactions such as reload list, reload
  detail, close modal, show toast, or navigate.
- Do not call services or stores directly from views.

Follow `docs/agent/frontend/commands.md`.

### 6. Page VM

Add or update the page VM hook in `apps/web/src/pages/<page>/`.

- Page VM hooks own React lifecycle, page-local state, and command-result
  reactions such as navigation, modal feedback, and form reset.
- Page VM hooks own validation feedback, but submit or mutation commands own
  request schema validation before service calls.
- Views read state and trigger behavior through the page VM hook only.
- Do not call stores, services, or commands directly from views.

Follow `docs/agent/frontend/architecture.md`.

### 7. i18n

Add or update i18n strings for every new or changed user-facing string.
This step is not optional — do not leave hardcoded strings in the UI.

- Use `useAppTranslation()` in React components.
- Use `tDefault(key, defaultText)` outside React.
- Every i18n call must include a default string.
- Run `pnpm --filter web run i18n:scan` after changing i18n strings.

Follow `docs/agent/frontend/i18n.md`.

### 8. Forms (conditional)

Determine whether the feature includes user input forms. If yes, read and
follow `docs/agent/frontend/forms.md` before writing form UI.

### 9. View

Add or update the page view and feature components.

- Check existing shared, feature, and page components before creating a new
  component.
- Keep page views focused on rendering VM state and calling VM handlers.
- Keep domain-specific components under
  `apps/web/src/features/<area>/<resource>/components` or
  `apps/web/src/features/<area>/components`.
- Keep cross-domain, domain-neutral components in
  `apps/web/src/shared/components`.

Follow `docs/agent/frontend/shared-components.md` and
`docs/agent/frontend/code-placement.md`.

### 10. Permission gating (conditional)

Determine whether the feature exposes mutating actions (create/edit/delete) that
some roles must not perform. If yes, gate them in the UI so read-only users do
not see actions that would only fail with `403`.

- Derive the active role with `useCanManageStoreResources()` /
  `useActiveOrgRole()` from `apps/web/src/app/global/activeOrg/useActiveOrgRole.ts`.
- The page VM exposes a `canManage` flag; the view hides create buttons and
  row action columns when it is false, leaving reads visible.
- This is UX defense-in-depth only — the backend `requireOrgRole` stays the
  enforcement point.

See the "Frontend Permission Gating" section of `docs/features/permissions.md`
for the canonical policy and the read-only pattern.

### 11. Tests

Determine whether the feature requires new or updated tests. Confirm scope
with the user when not already clear.

- Add focused tests for meaningful API error normalization or command mapping.
- Do not invent mocked API error shapes; copy fixtures from backend Swagger or
  backend API tests.

Follow `docs/agent/frontend/api-error-testing.md`.

### 12. Verification

Run the narrowest useful checks before reporting the feature as complete.

- Run `docs/agent/frontend/architecture-validation.md`.
- Run `pnpm --filter web run lint`.
- Run `pnpm --filter web run build`.
- Run `pnpm --filter web run test` when frontend tests exist or change.
- Run `pnpm --filter web run i18n:scan` when i18n strings changed.

Follow `docs/agent/workflows/verification.md`.
