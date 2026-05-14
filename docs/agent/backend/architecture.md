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
- Use `validate` middleware for request validation.
- Route handlers may call services and send responses.
- Put meaningful branching, persistence, transformations, and permission checks in services.
- Use existing error helpers and the global error handler instead of ad hoc error responses.

## Service Layer

- Put backend business logic in `src/services`.
- Define services as classes, export a `createXService()` factory, and export a singleton `xService` for route/config modules.
- Use factory functions when a service needs testable dependencies.
- Services may call repositories, Redis clients, external integrations, and utility functions.
- Services should not start HTTP listeners or depend on Express request/response objects unless the behavior is middleware-specific.

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
