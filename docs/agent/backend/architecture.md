# Backend Architecture

Use this guide when adding or updating backend code in `apps/api`.

## Request Flow

```txt
server.ts -> createApp() -> middleware -> /api routes -> /api/v1 routes -> route handler -> service -> response
```

Startup flow:

- `src/server.ts` validates env through imports, connects MongoDB, connects Redis, creates the Express app, then starts the HTTP server.
- `src/app.ts` builds the Express app and registers middleware, Swagger, routes, 404 handling, and the global error handler.

## Source Layout

```txt
apps/api/src/
  app.ts
  server.ts
  config/
  middlewares/
  models/
  repositories/
  routes/
    index.ts
    v1/
  services/
  types/
  utils/
```

Use these locations:

- `config/` for environment, database, CORS, and infrastructure configuration
- `middlewares/` for Express middleware
- `models/<domain>/model.ts` for domain model types and constants
- `models/<domain>/mapper.ts` for mapping domain entities to public resource DTOs
- `models/<domain>/mongo.ts` for Mongo/Mongoose schema and model
- `repositories/<domain>/` for data access contracts and implementations
- `routes/v1/` for versioned API routes
- `services/` for business logic and data access orchestration
- `utils/` for shared backend utilities such as errors, logging, Swagger, and error mapping
- `types/` for backend TypeScript declaration files
- `tests/` for backend tests outside production source

## Route Layer

- Add new feature routes under `src/routes/v1`.
- Register new route modules in `src/routes/v1/index.ts`.
- Keep route handlers thin.
- Follow the route prefix and middleware conventions in
  `docs/features/permissions.md` when adding admin or merchant routes.
- Route modules may be split by actor prefix, resource, capability, or
  middleware boundary. A domain does not need every endpoint in one route file.
- Prefer route files that mirror URL patterns when a module grows large:
  `organizations/[organizationId]/stores/[storeId].ts` should map to
  `/organizations/:organizationId/stores/:storeId`.
- Put route aggregation in `_router.ts`. Keep path-specific `index.ts` files
  for the directory's own collection path, such as `GET /organizations` and
  `POST /organizations`.
- When a path parameter has child routes, make it a folder and put its own
  route handlers in `[param]/index.ts`, not a sibling `[param].ts` file.
- Name path parameter folders or files with square brackets, such as
  `[organizationId].ts`. Use underscore-prefixed files for non-route helpers,
  such as `_openapi.ts`.
- Keep OpenAPI component files near the route subtree that owns them. Root
  `_openapi.ts` should contain only components shared by that route subtree;
  nested resources such as `memberships/` or `stores/` should keep their own
  `_openapi.ts`.
- Use `validate` middleware for `body` and `params` validation only. For `query` params, call `schema.parse(req.query)` directly inside the handler — `req.query` is a getter-only property on `IncomingMessage` and cannot be reassigned.
- Route handlers may call services and send responses.
- Put meaningful branching, persistence, transformations, and permission checks in services.
- Use existing error helpers and the global error handler instead of ad hoc error responses.

## Service Layer

- Put backend business logic in `src/services`.
- Define services as classes, export a `createXService()` factory, and export a singleton `xService` for route/config modules.
- Use factory functions when a service needs testable dependencies.
- Services may call repositories, Redis clients, external integrations, and utility functions.
- Services should call domain mappers when returning public resource DTOs instead of raw persistence entities.
- Simple endpoint action responses can be assembled inline in the service.
- Services should not start HTTP listeners or depend on Express request/response objects unless the behavior is middleware-specific.

## Model and Contract Naming

- Backend persistence/domain types use `<Domain>Entity` in `models/<domain>/model.ts`.
- Public API contract types live in `packages/shared` when Web consumes or may consume them.
- Primary public resource DTOs use `<Domain>Dto`, such as `TodoDto`.
- Request body contracts use action names such as `CreateTodoRequest` or `UpdateTodoRequest`.
- Endpoint-specific action results use response names such as `DeleteTodoResponse`.
- Keep entity and DTO types separate even when their fields currently match.

## Domain Mappers

- Put resource `Entity -> DTO` conversion functions in `models/<domain>/mapper.ts`.
- Keep each domain's mapper in its own domain folder.
- Name resource DTO mapper functions after their target public contract, such as `toTodoDto` or `toAuthUserDto`.
- Add a response mapper only when an endpoint response shape becomes complex or reused.
- Do not put backend entity-to-resource-DTO conversion functions in `packages/shared`.
- Keep `model.ts` focused on domain types and constants.
- Repositories return backend entities or repository result objects; services call mappers before returning public resource DTOs to route handlers.

## Persistence

When a feature stores or changes persistent data, define the schema before route implementation.

Follow `docs/agent/backend/mongo-schema.md`.

Use `docs/agent/backend/repository.md` when a feature reads or writes data.

## Environment

- Required env vars are validated in `src/config/env.ts`.
- If a new required env var is added, update `apps/api/.env.example` and `apps/api/tests/setup/env.ts`.
- Startup should fail clearly when required infrastructure config is invalid or unavailable.

## Testing

- Use `docs/agent/backend/api-testing.md` for route or middleware behavior.
- Use `docs/agent/backend/unit-testing.md` for service or utility logic.
- API tests should use `createApp()` with Supertest.
- Unit tests should import the unit directly without starting Express.
