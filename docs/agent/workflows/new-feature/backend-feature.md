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

## 2. API and Backend Flow

- Follow `docs/agent/backend/architecture.md`.
- Add new feature routes under `apps/api/src/routes/v1`.
- Update Swagger/OpenAPI docs with `docs/agent/backend/swagger.md`.
- Validate API request params, query, and body with Zod.
- Avoid `any` unless third-party library types make a narrower type impractical.
- Follow backend error handling and logging docs when adding or changing behavior.
- If a new required env variable is added, update `apps/api/.env.example` and `apps/api/tests/setup/env.ts`.
- Confirm package additions with the user before installing dependencies.

## 3. Tests

- Confirm with the user whether to add or update tests when testing scope is not already clear.
- Add focused tests for meaningful behavior.
- Do not add shallow tests that only prove a route exists.
- Test important happy paths, edge cases, and expected failures.
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
