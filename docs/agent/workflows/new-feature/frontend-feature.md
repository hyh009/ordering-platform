# Frontend Feature Checklist

Use this guide when a new feature adds or changes frontend behavior in `apps/web`.

## Flow

1. Define the page and feature shape with the user.
2. Add API integration when needed.
3. Implement UI, state, and feedback.
4. Add or update tests when needed.
5. Verify the change.

## 1. Page and Feature Shape

- Follow `docs/agent/frontend/architecture.md`.
- Check `docs/agent/frontend/state-ownership.md` when deciding where frontend state belongs.
- Check `docs/agent/frontend/commands.md` before adding or moving command files.
- Check `docs/agent/frontend/shared-components.md` before creating or moving components.
- Check `docs/agent/frontend/reusable-primitives.md` before adding helpers, shared hooks, utilities, or app-wide runtime modules.
- Discuss the page, feature domain, state ownership, and API-backed behavior with the user before implementation when the shape is not already clear.
- Before implementing new or changed frontend state, tell the user the state ownership plan:
  - Store state: app/domain state shared across handlers, flows, components, or pages.
  - Page VM state: page-only process state, route lifecycle state, command-result reactions, and page-owned form/control state.
  - Component local state: UI-only state owned by one component, such as menu open state, hover state, password visibility, or local-only search text.
- Ask before coding when a state value could reasonably belong in more than one place.
- Ask before coding when state ownership remains ambiguous after checking the state ownership guide.
- Put page views and page VM hooks under `apps/web/src/pages`.
- Put page commands under `apps/web/src/pages` only when the async flow is page-owned.
- Put app shell UI under `apps/web/src/app/layout`.
- Put route guards under `apps/web/src/app/routing`.
- Put app and route error boundaries under `apps/web/src/app/error`.
- Put domain feature state, commands, actions, and runtimes under `apps/web/src/features/<domain>/<slice>`.
- Put reusable domain components under `apps/web/src/features/<domain>/components`.
- Put frontend models and DTO conversion helpers under `apps/web/src/models`.
- Use React local state for UI-only state such as modals, menus, hover state, and temporary input text.
- Keep domain-specific components out of `apps/web/src/shared/components`.
- Do not add a new state or data-fetching framework unless the user asks.

## 2. API Integration

- Use this step only when the feature calls or changes backend data.
- Check backend Swagger/OpenAPI docs or backend API tests before writing frontend fixtures.
- Add endpoint paths under `apps/web/src/api/paths`.
- Add domain or app services under `apps/web/src/services`.
- Services call `apiJson` and use `src/models` helpers for DTO deserialize/serialize.
- Keep raw API DTOs out of pages, commands, actions, stores, and views.
- Let `apiJson` throw `ApiError`; do not catch API errors in services.
- Follow `docs/agent/frontend/error-feedback.md` when mapping API errors.
- Update `apps/web/.env.example` when a new frontend env variable is required.
- Update README or setup docs when local usage changes.

## 3. UI, State, and Feedback

- Check existing shared, feature, and page components before creating a new component.
- Check existing reusable primitives before adding a new shared hook, helper, utility, or app-wide runtime module.
- Components read state and trigger behavior through page VM hooks.
- Commands coordinate service calls, actions, loading states, errors, and save flows.
- Use feature commands for async flows that should grow with a domain feature or be shared across pages.
- Feature actions mutate feature stores.
- Stores hold state only.
- Use inline error state for page-owned data errors.
- Use `docs/agent/frontend/shared-feedback-ui.md` only when the error needs toast or modal presentation.

## 4. Tests

- Add focused tests for meaningful API error normalization or command mapping changes.
- Use `docs/agent/frontend/api-error-testing.md` for API error tests.
- Do not invent mocked API error shapes; copy fixtures from backend Swagger or backend API tests.
- DOM/component tests are not required yet.
- If UI or DOM behavior changes, list concrete manual checks in the final response.

## 5. Verification

- Follow `docs/agent/workflows/verification.md`.
- Run `pnpm --filter web run test` when frontend tests exist or change.
- Run `pnpm --filter web run lint`.
- Run `pnpm --filter web run build`.

## Related Docs

- `docs/agent/frontend/architecture.md`
- `docs/agent/frontend/architecture-diagram.md`
- `docs/agent/frontend/state-ownership.md`
- `docs/agent/frontend/commands.md`
- `docs/agent/frontend/shared-components.md`
- `docs/agent/frontend/reusable-primitives.md`
- `docs/agent/frontend/error-feedback.md`
- `docs/agent/frontend/api-error-testing.md`
- `docs/agent/frontend/shared-feedback-ui.md`
