# Backend Feature Checklist

Use this guide when a new feature adds or changes backend behavior in `apps/api`.

## Flow

1. Design MongoDB schema when persistent data is needed. Confirm schema and indexes with the user.
2. Implement API routes and backend flow.
3. Add or update tests when needed. Confirm testing scope with the user.
4. Verify the change.

## 1. MongoDB Schema

- Use this step only when the feature stores or changes persistent data.
- Define the schema/model before route implementation.
- Discuss MongoDB indexes with the user before adding them.
- Follow `docs/agent/backend/mongo-schema.md`.
- Follow `docs/agent/backend/repository.md` when adding or changing data access.

## 2. API and Backend Flow

- Follow `docs/agent/backend/architecture.md`.
- Add new feature routes under `apps/api/src/routes/v1`.
- Validate API request params, query, and body with Zod.
- Avoid `any` unless third-party library types make a narrower type impractical.
- Follow backend error handling and logging docs when adding or changing behavior.
- If a new required env variable is added, update `apps/api/.env.example` and `apps/api/tests/setup/env.ts`.
- Confirm package additions with the user before installing dependencies.

### Route Checklist

Use this checklist when adding or expanding API routes.

1. Confirm the actor surface and route prefix before writing code.
   - Use `docs/features/permissions.md` for admin and merchant prefixes.
   - Treat prefixes such as `/admin` and `/merchant` as actor surfaces, not
     frontend page paths.
   - Register the route subtree in `apps/api/src/routes/v1/index.ts`.
2. Mirror the URL pattern in the route file tree.
   - Use `index.ts` for the collection path owned by the directory.
   - Use `[param]/index.ts` when a path parameter has child routes.
   - Use `[param].ts` only for leaf parameter routes with no child routes.
   - Use `_router.ts` to aggregate a route subtree when it has multiple child
     route modules.
   - Use `Router({ mergeParams: true })` in child routers that read parent
     params.
3. Keep route handlers thin.
   - Validate `body` and `params` with `validate(...)`.
   - Parse `query` with the Zod schema inside the handler.
   - Call services for business logic, persistence, transformations, and
     permission-sensitive behavior.
   - Send only the response shape from the handler.
4. Keep OpenAPI docs complete and close to ownership.
   - Follow `docs/agent/backend/swagger.md`.
   - Put operation docs next to the route handler.
   - Put shared OpenAPI components in `_openapi.ts` near the route subtree that
     owns them.
   - Prefix actor-surface tags with the actor, such as
     `Admin / Organizations`.
   - Keep root `_openapi.ts` limited to components shared by the root subtree.
     Nested resources such as `memberships/` or `stores/` should own their own
     `_openapi.ts`.
   - Document params, query, request body, success response, expected errors,
     and concrete error `code` examples.
5. Check nearby stale route references.
   - Search tests, frontend API paths, docs, and OpenAPI refs for the old path
     or old module name.
   - Update only references owned by the requested API change.

## 3. Tests

- Confirm with the user whether to add or update tests when testing scope is not already clear.
- Add focused tests for meaningful behavior.
- Do not add shallow tests that only prove a route exists.
- Test important happy paths, edge cases, and expected failures.
- For nested route trees, add a focused API test that proves parent params still
  reach child routers.
- Do not add tests only to prove Swagger/OpenAPI docs exist.
- Use `docs/agent/backend/api-testing.md` for route or middleware behavior.
- Use `docs/agent/backend/unit-testing.md` for service or utility logic.

## 4. Verification

- Follow `docs/agent/workflows/verification.md`.

## Related Docs

- `docs/agent/backend/architecture.md`
- `docs/agent/backend/mongo-schema.md`
- `docs/agent/backend/repository.md`
- `docs/agent/backend/swagger.md`
- `docs/agent/backend/api-testing.md`
- `docs/agent/backend/unit-testing.md`
- `docs/agent/backend/error-handling.md`
- `docs/agent/backend/throwing-errors.md`
- `docs/agent/backend/logging.md`
