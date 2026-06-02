# Frontend Feature Checklist

Use this guide when a new feature adds or changes frontend behavior in
`apps/web`.

## Flow

1. Define the page, feature domain, and state ownership with the user.
2. Implement API integration and model boundaries when backend data is needed.
3. Implement UI, state, and feedback.
4. Add or update tests when needed. Confirm testing scope with the user.
5. Verify the change.

## 1. Page and Feature Shape

- Follow `docs/agent/frontend/architecture.md`.
- Discuss the page, feature domain, state ownership, and API-backed behavior
  with the user before implementation when the shape is not already clear.
- Check `docs/agent/frontend/state-ownership.md` when deciding where frontend
  state belongs.
- Check `docs/agent/frontend/commands.md` before adding or moving command files.
- Check `docs/agent/frontend/shared-components.md` before creating or moving
  components.
- Check `docs/agent/frontend/reusable-primitives.md` before adding helpers,
  shared hooks, utilities, or app-wide runtime modules.
- Do not add a new state or data-fetching framework unless the user asks.

### Placement Checklist

Use this checklist when adding or moving frontend code.

1. Put route-owned files under `apps/web/src/pages`.
   - Page views, page VM hooks, page-local form hooks, and page-owned commands
     live with the route.
   - Page commands are only for async flows owned by that page.
   - Do not import private files from another page folder.
2. Put domain feature runtime under `apps/web/src/features/<domain>`.
   - Feature state, commands, actions, stores, and runtimes live under a domain
     slice.
   - Reusable domain components live under
     `apps/web/src/features/<domain>/components`.
   - Keep domain-specific components out of `apps/web/src/shared/components`.
3. Put app-level runtime under `apps/web/src/app`.
   - App shell UI goes under `apps/web/src/app/layout`.
   - Route guards go under `apps/web/src/app/routing`.
   - App and route error boundaries go under `apps/web/src/app/error`.
4. Put frontend model boundaries under `apps/web/src/models`.
   - Prefer `apps/web/src/models/<domain>/` for domain model APIs.
   - Import domain model APIs through `@/models/<domain>`.

### State Checklist

Use this checklist before implementing new or changed frontend state.

1. Tell the user the state ownership plan when the ownership is not obvious.
2. Use feature stores for app or domain state shared across handlers, flows,
   components, or pages.
3. Use page VM state for page-only process state, route lifecycle state,
   command-result reactions, and page-owned form/control state.
4. Use component local state for UI-only state owned by one component, such as
   menu open state, hover state, password visibility, or local-only search text.
5. Ask before coding when a state value could reasonably belong in more than
   one place.

## 2. API Integration and Models

- Use this step only when the feature calls or changes backend data.
- Check backend Swagger/OpenAPI docs or backend API tests before writing
  frontend fixtures.
- Add endpoint paths under `apps/web/src/api/paths`.
- Add domain or app services under `apps/web/src/services`.
- Services call `apiJson` and use `src/models` helpers for DTO
  deserialize/serialize.
- Let `apiJson` throw `ApiError`; do not catch API errors in services.
- Follow `docs/agent/frontend/error-feedback.md` when mapping API errors.
- Update `apps/web/.env.example` when a new frontend env variable is required.
- Update README or setup docs when local usage changes.

### Model Checklist

Use this checklist when adding or changing frontend model files.

1. Keep shared contract source in `@repo/shared`.
   - DTO types, request/response types, API-boundary zod schemas, and stable
     public constants may be re-exported through the web model boundary.
   - Do not move API contract definitions into `apps/web`.
2. Use `apps/web/src/models/<domain>/index.ts` as the domain public surface.
   - Pages, features, and services import through `@/models/<domain>`.
   - Do not import private model files such as `model.ts`, `types.ts`, or
     `display.ts` from outside the domain model folder.
   - Do not import `@repo/shared` directly from pages, features, or services
     when a domain model boundary already owns that contract surface.
3. Keep DTO conversion in `model.ts`.
   - Start with `model.ts` for DTO-to-model conversion.
   - Add `requestMapper.ts` or `formMapper.ts` only when the direction or
     caller makes the split clearer.
4. Keep domain UI display helpers in `display.ts`.
   - Use `display.ts` for enum labels, translated option labels, localized text
     fallback, and helpers for controls that need string labels.
   - Components still import those helpers through `@/models/<domain>`.
5. Keep raw API DTOs out of pages, commands, actions, stores, and views.

## 3. UI, State, and Feedback

- Check existing shared, feature, and page components before creating a new
  component.
- Check existing reusable primitives before adding a new shared hook, helper,
  utility, or app-wide runtime module.
- Components read state and trigger behavior through page VM hooks.
- Views do not call services, commands, or stores directly.
- Commands coordinate service calls, actions, loading states, errors, and save
  flows.
- Use feature commands for async flows that should grow with a domain feature or
  be shared across pages.
- Feature actions mutate feature stores.
- Stores hold state only.
- Use inline error state for page-owned data errors.
- Use `docs/agent/frontend/shared-feedback-ui.md` only when the error needs
  toast or modal presentation.
- Use `docs/agent/frontend/i18n.md` when adding or changing user-facing strings.

### UI Checklist

Use this checklist when adding or changing visible UI.

1. Keep page views focused on rendering VM state and calling VM handlers.
2. Keep route lifecycle, navigation after command results, modal reactions, and
   form reset decisions in the page VM hook.
3. Keep feature components reusable within the domain; avoid page-owned API
   flows inside reusable domain components.
4. Keep project-generic controls in `apps/web/src/shared/components` only when
   they are cross-domain and domain-neutral.
5. Localize user-facing strings with `useAppTranslation()` in React components
   or `tDefault(...)` outside React.

## 4. Tests

- Confirm with the user whether to add or update tests when testing scope is not
  already clear.
- Add focused tests for meaningful API error normalization or command mapping
  changes.
- Use `docs/agent/frontend/api-error-testing.md` for API error tests.
- Do not invent mocked API error shapes; copy fixtures from backend Swagger or
  backend API tests.
- DOM/component tests are not required yet.
- If UI or DOM behavior changes, list concrete manual checks in the final
  response.

## 5. Verification

- Follow `docs/agent/workflows/verification.md`.
- Run `docs/agent/frontend/architecture-validation.md` before finishing
  frontend code changes.
- Run `pnpm --filter web run test` when frontend tests exist or change.
- Run `pnpm --filter web run lint`.
- Run `pnpm --filter web run build`.
- If i18n strings changed, run `pnpm --filter web run i18n:scan` with the
  narrowest useful scope.

## Related Docs

- `docs/agent/frontend/architecture.md`
- `docs/agent/frontend/architecture-diagram.md`
- `docs/agent/frontend/architecture-validation.md`
- `docs/agent/frontend/state-ownership.md`
- `docs/agent/frontend/commands.md`
- `docs/agent/frontend/shared-components.md`
- `docs/agent/frontend/reusable-primitives.md`
- `docs/agent/frontend/error-feedback.md`
- `docs/agent/frontend/api-error-testing.md`
- `docs/agent/frontend/shared-feedback-ui.md`
- `docs/agent/frontend/i18n.md`
