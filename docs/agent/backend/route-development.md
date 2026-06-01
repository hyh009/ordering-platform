# Backend Route Development

Use this guide when adding or changing an API route handler in `apps/api`.

## Goal

When adding or changing a route:

1. Reuse existing patterns first.
2. Keep handlers thin.
3. Put business logic in services.
4. Keep repositories focused on data access.
5. Follow the checklist in order.

## Checklist

Every step must be reviewed. Not every step requires changes — record the
outcome (changed, no change needed, or not applicable) before moving on.

### 1. Shared contracts

Determine whether the route introduces a new request or response shape that
the frontend consumes. If yes, add or update the types and Zod schemas in
`packages/shared` before writing any route code.

Follow `docs/agent/workflows/shared-contracts.md`.

### 2. MongoDB schema

Determine whether the route stores or changes persistent data. If yes, define
or update the Mongo schema and indexes before writing the repository or service.

Follow `docs/agent/backend/mongo-schema.md`.

### 3. Repository

Determine whether the route requires new data access methods. If yes, add them
to the repository contract and implementation before writing the service.

Follow `docs/agent/backend/repository.md`.

### 4. Service

Add or update business logic, data access orchestration, and entity-to-DTO
mapping in `src/services/<domain>.service.ts`. Do not put this logic in the
route handler.

Follow the Service Layer section of `docs/agent/backend/architecture.md`.

### 5. Route handler

Add the route under `src/routes/v1/`. Register new route modules in
`src/routes/v1/index.ts`.

**Validation rules — must follow exactly:**

- `body` — use `validate(schema)` middleware.
- `params` — use `validate(schema, 'params')` middleware.
- `query` — call `schema.parse(req.query)` directly inside the handler.
  `req.query` is a getter-only property on `IncomingMessage` in Express 5 and
  cannot be reassigned. Never pass `'query'` to `validate`.

**Handler shape:**

- Keep handlers thin: parse input, call a service, send the response.
- Do not put business logic, permission checks, or DB calls in the handler.
- Use `requireAuth` and `requireOrgRole` from `src/middlewares/auth` for access control.

Follow the Route Layer section of `docs/agent/backend/architecture.md`.

### 6. OpenAPI docs

Document every new or changed operation inline next to the route handler.
This step is not optional — do not leave routes undocumented.

Follow `docs/agent/backend/swagger.md`.

### 7. Error handling

Use `AppError` subclasses for expected errors. Use `Error` for unexpected
failures. Do not return raw error objects or ad hoc response shapes.

Follow `docs/agent/backend/throwing-errors.md`.

### 8. Tests

Add focused tests covering the happy path, key edge cases, and expected error
responses. Do not add shallow tests that only prove a route exists.

Follow `docs/agent/backend/api-testing.md`.

### 9. Verification

Run the narrowest useful build, lint, and test checks before reporting the
route as complete.

Follow `docs/agent/workflows/verification.md`.
