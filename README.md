# Ordering Platform

A full-stack multi-tenant ordering platform for restaurant merchants, platform
administrators, and guest storefront ordering.

Project walkthrough slides:
[Google Slides](https://docs.google.com/presentation/d/1Gx8pIBz0TbGntUpWYqjTap-SVAAS3nmkPmv7rg-Lf5A/edit?usp=sharing)

No live deployment is currently available. The slides above show the product
scope, core flows, and screen walkthrough.

## Overview

Ordering Platform is a TypeScript monorepo that models the operational flow of
a restaurant ordering system:

- Platform admins manage organizations, users, stores, allergens, and dietary
  markers.
- Merchants manage store settings, categories, tags, products, modifiers, and
  incoming orders.
- Guests enter a public storefront, create or join an order, build a cart,
  submit batches, and track order status.

The project focuses on practical full-stack product architecture: shared API
contracts, explicit frontend boundaries, backend domain services, optimistic
concurrency checks, and guest ordering lifecycle rules.

## What This Project Demonstrates

- Full-stack TypeScript development across API, web, and shared packages.
- Express API design with versioned routes, service/repository boundaries, and
  OpenAPI documentation.
- React + Vite frontend architecture with page view-model hooks, page commands,
  feature stores, services, and domain models.
- Cross-package API contracts using Zod schemas and shared DTO types.
- Multi-tenant access modeling with platform users, organizations, memberships,
  and store ownership.
- Guest storefront flows for new orders, group ordering, join codes, cart
  submission, order tracking, and recent orders.
- MongoDB persistence, Redis-backed runtime support, auth/session handling,
  structured logging, validation, and automated tests.

## Core Features

### Platform Administration

- Super-admin login and protected management routes.
- Organization creation and management.
- Organization membership management.
- User listing and active-user ownership selection.
- Allergen and dietary marker administration.

### Merchant Management

- Store creation, selection, and settings.
- Category, tag, product, and product modifier management.
- Product availability and menu publishing support.
- Merchant order list and detail pages.
- Staff-driven order progression for payment, kitchen status, completion, and
  cancellation.

### Guest Storefront

- Public store entry at `/s/:storeId`.
- Dine-in and takeaway ordering modes.
- Guest identity selection with anonymous participant support.
- Join Code and Invite QR flows for group ordering.
- Menu browsing, product configuration, cart review, and order submission.
- Dine-in pay-later add-on flow while the order remains open.
- Order tracking with batch-level status and browser-local recent orders.

## Architecture

The workspace is split into three main packages:

- `apps/api`: Express + TypeScript API.
- `apps/web`: React + Vite frontend.
- `packages/shared`: shared API contracts, DTOs, error envelopes, and Zod
  schemas.

Frontend code follows this flow:

```txt
View -> Page VM Hook -> Page Commands -> Feature Actions -> Feature Store | Service -> API
```

Backend code keeps HTTP routes thin and moves domain behavior into services,
repositories, model mappers, and shared boundary contracts.

## Tech Stack

- TypeScript
- pnpm workspaces
- React
- Vite
- React Router
- Zustand
- i18next
- Tailwind CSS
- Express
- MongoDB / Mongoose
- Redis
- Zod
- Passport / JWT
- Pino
- Swagger / OpenAPI
- Vitest
- Supertest

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
│  ├─ agent/
│  ├─ features/
│  └─ schema/
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

Create the first super-admin account:

```bash
INIT_SUPER_ADMIN_EMAIL=admin@example.com \
INIT_SUPER_ADMIN_USERNAME=admin \
INIT_SUPER_ADMIN_PASSWORD='ChangeMe123' \
pnpm run init:super-admin
```

Seed initial data:

```bash
pnpm run seed
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

`pnpm run build`, `pnpm --filter api run build`, and
`pnpm --filter web run build` build `@repo/shared` first so API and web can
resolve the shared runtime package.

## Shared Contracts

`packages/shared` publishes `@repo/shared` for API and web consumers.

Use it for public HTTP contracts:

- Request and response DTO types.
- API success and error envelopes.
- Stable public unions and error codes.
- Zod schemas used at API boundaries.

App internals stay inside their app folders. Backend Mongo/session models stay
in `apps/api`, and frontend view models or store state stay in `apps/web`.

## Product Model

The current auth and tenant foundation uses these concepts:

- `User`: platform account with `isSuperAdmin` and an account `status`.
- `Organization`: tenant boundary for restaurants or merchants.
- `OrganizationMembership`: links a user to an organization with a role such as
  `org_owner`, `org_admin`, or `staff`.
- `Store`: merchant-owned ordering location with menu, operation settings, and
  public storefront configuration.
- `Cart`: guest-side draft order state for dine-in or takeaway ordering.
- `Order`: submitted ordering record with payment, kitchen, batch, and
  completion state.

Super admins create organizations and choose an existing active user as the
initial owner. Regular users do not self-create organizations in the current
direction.

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

Current route groups include auth, admin, merchant, public storefront, and
health APIs.

```txt
/api
└─ /v1
   ├─ /auth
   ├─ /admin
   ├─ /merchant
   ├─ /public
   └─ /health
```

Examples:

```txt
GET /api/v1/health
POST /api/v1/auth/login
GET /api/v1/public/stores/:storeId
GET /api/v1/public/guest/session
GET /api/v1/merchant/stores/:storeId/orders
```

## Documentation

Feature and architecture notes are kept in `docs/`:

- `docs/features/ordering.md`
- `docs/features/ordering-frontend.md`
- `docs/features/guest-ordering-entry-flow.md`
- `docs/features/merchant-orders.md`
- `docs/features/auth.md`
- `docs/schema/mongo.md`

Agent-facing implementation guides live under `docs/agent/`.
