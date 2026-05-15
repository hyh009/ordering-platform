# Ordering Platform

Full-stack ordering platform built with React, Vite, Express, TypeScript, and
pnpm workspaces.

The project is being migrated from a starter template. The current Todo demo is
kept temporarily until the ordering schemas are designed.

## Foundation

- Express API with versioned routes under `/api/v1`
- React frontend powered by Vite and TypeScript
- Frontend structure for app composition, pages, feature state, API services, and shared UI
- Shared API contract package for request/response DTOs, error envelopes, and Zod schemas
- TypeScript with `NodeNext` module resolution
- Path alias support with `@src/*`
- MongoDB and Redis Docker Compose setup
- Centralized environment validation with Zod
- Structured logging with Pino
- Request ID and request completion logging middleware
- Centralized `AppError` error handling
- Swagger/OpenAPI documentation
- Basic API security middleware with Helmet, CORS, cookie parsing, and JSON body limits
- Vitest and Supertest API test setup

## Project Structure

```txt
.
├─ apps/
│  ├─ api/
│  │  ├─ docker/
│  │  ├─ src/
│  │  │  ├─ config/
│  │  │  ├─ middlewares/
│  │  │  ├─ models/
│  │  │  ├─ repositories/
│  │  │  ├─ routes/
│  │  │  ├─ services/
│  │  │  ├─ types/
│  │  │  └─ utils/
│  │  ├─ tests/
│  │  ├─ package.json
│  │  └─ tsconfig.json
│  └─ web/
│     ├─ public/
│     ├─ src/
│     │  ├─ api/
│     │  ├─ app/
│     │  ├─ features/
│     │  ├─ models/
│     │  ├─ pages/
│     │  ├─ services/
│     │  ├─ shared/
│     │  └─ styles/
│     ├─ package.json
│     └─ vite.config.ts
├─ packages/
│  └─ shared/
│     ├─ src/
│     │  └─ contracts/
│     ├─ package.json
│     └─ tsconfig.json
├─ docs/
│  └─ agent/
├─ package.json
├─ pnpm-lock.yaml
├─ pnpm-workspace.yaml
└─ README.md
```

## Getting Started

Install dependencies:

```bash
pnpm install
```

Create the API environment file:

```bash
cp apps/api/.env.example apps/api/.env
```

Create the web environment file:

```bash
cp apps/web/.env.example apps/web/.env
```

Start MongoDB and Redis:

```bash
pnpm --filter api run up
```

Start the API development server:

```bash
pnpm --filter api run dev
```

Start the web development server:

```bash
pnpm --filter web run dev
```

Start all development servers:

```bash
pnpm run dev
```

Test the health endpoint:

```bash
curl http://localhost:9000/api/v1/health
```

Open Swagger docs:

```txt
http://localhost:9000/docs
```

## Workspace Scripts

Run commands from the repository root:

```bash
pnpm run dev
pnpm run build
pnpm run lint
pnpm run test
```

Run a command for one package:

```bash
pnpm --filter api run dev
pnpm --filter web run dev
```

`pnpm run build`, `pnpm --filter api run build`, and `pnpm --filter web run build`
build `@repo/shared` first so API and web can resolve the shared runtime package.

## Shared Contracts

`packages/shared` publishes `@repo/shared` for API and web consumers.

Use it for public HTTP contracts:

- request and response DTO types
- API success/error envelopes
- stable public unions and error codes
- Zod schemas used at API boundaries

Keep app internals in their app folders. For example, backend Mongo/session
models stay in `apps/api`, and frontend view models or store state stay in
`apps/web`.

## Environment Variables

The API validates environment variables on startup.

Create `apps/api/.env` from `apps/api/.env.example`:

```env
NODE_ENV=development
PORT=9000
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/app_db?replicaSet=rs0
REDIS_URL=redis://localhost:6379
```

The web app reads its API base URL from `apps/web/.env`:

```env
VITE_API_BASE_URL=http://localhost:9000
```

## API Routes

Current routes include auth, health, and the temporary Todo demo that will be
replaced after the ordering schema is designed.

```txt
/api
└─ /v1
   ├─ /auth
   │  ├─ /register
   │  ├─ /login
   │  ├─ /refresh
   │  ├─ /logout
   │  ├─ /logout-all
   │  └─ /me
   ├─ /health
   └─ /todos
```

Example:

```txt
GET /api/v1/health
GET /api/v1/todos
```

## Path Alias

Use `@src/*` for API source imports:

```ts
import routes from '@src/routes';
```

Configured in `apps/api/tsconfig.json`:

```json
"paths": {
  "@src/*": ["src/*"]
}
```
