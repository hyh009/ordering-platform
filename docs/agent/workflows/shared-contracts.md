# Shared API Contracts

Use this guide when changing `packages/shared`.

## Boundary

`@repo/shared` is for public HTTP contracts shared by API and Web:

- request/response DTO types
- response envelopes and error details
- stable public enums/unions
- zod schemas used at API boundaries

Keep backend internals out of shared:

- Mongo/Mongoose schemas
- repository/service types
- backend entity-to-DTO mapper functions
- password hashes, refresh-token hashes, session entities
- frontend VM/store/UI state

## Usage

- API routes may import shared zod schemas for `validate(...)`.
- API routes may import shared request/response types for Express route generics.
- API services should map backend entities to shared DTOs in `apps/api/src/models/<domain>/mapper.ts`.
- Backend models and services should define their own domain/input/output types and only reuse shared public enums/unions when useful.
- Web domain model boundaries may re-export shared DTO types, zod schemas, and stable public constants through `apps/web/src/models/<domain>/index.ts`; pages, features, and services should import those through `@/models/<domain>`.
- Web services may import shared DTO and response types through the domain model boundary, then map DTOs into frontend models in `src/models`.
- If an API response shape differs by endpoint, create a separate contract type instead of forcing a generic one.

## Naming

- Public resource DTO types use `<Domain>Dto`, such as `TodoDto`.
- Request body types use action names such as `CreateTodoRequest` or `UpdateTodoRequest`.
- Endpoint-specific response data types use action names such as `DeleteTodoResponse`.
- Keep backend entity types out of shared even when the DTO fields currently match the entity fields.
- Keep resource DTO mapper functions in the API domain mapper, named after the target contract such as `toTodoDto` or `toAuthUserDto`.

## Build Output

Current approach:

- `@repo/shared` exposes committed source only through its TypeScript build output in `dist/`.
- Package exports provide both ESM and CommonJS runtime entries:
  - `import` -> `dist/index.js`
  - `require` -> `dist/index.cjs`
- App-local `dev` and `build` scripts build `@repo/shared` before starting API/Web, so a clean checkout does not depend on ignored `dist/` files already existing.
- `scripts/write-cjs.mjs` keeps CommonJS output available for the compiled API, which currently loads shared code with `require('@repo/shared')`.

Future options:

- Keep the current lightweight script while `packages/shared` stays small and contract-only.
- If shared output grows or needs more package entrypoints, switch to a dedicated package build tool that emits ESM, CommonJS, and declarations from one config.
- If the API becomes ESM-only, remove the CommonJS output after confirming no runtime path still uses `require('@repo/shared')`.
