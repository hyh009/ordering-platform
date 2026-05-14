# Backend API Testing

Use this guide when adding or updating backend API integration tests.

## Test Tools

Use:

- `vitest` for the test runner and assertions
- `supertest` for Express API tests

Do not add another backend API test framework unless explicitly requested.

## Test Location

Place API tests under:

```txt
apps/api/tests
```

Use `.test.ts` filenames.

Shared test setup belongs under:

```txt
apps/api/tests/setup
```

Test files must stay outside `src` so production build only compiles application code.

## API Test Pattern

Use `createApp()` with `supertest`.

Example:

```ts
const app = createApp();

const response = await request(app).get('/api/v1/health');

expect(response.status).toBe(200);
```

This runs the Express middleware stack, routes, and error handler registered in `createApp()`.

Use `request.agent(app)` when a test needs cookie persistence across requests.

Example:

```ts
const app = createApp();
const agent = request.agent(app);

await agent.post('/api/v1/auth/login').send(credentials).expect(200);
await agent.get('/api/v1/me').expect(200);
```

## What to Test

Add API tests for:

- important happy paths
- expected client errors such as validation, unauthorized, not found, or conflict
- middleware behavior that affects responses, headers, cookies, or auth
- bugs that were fixed

Do not add repetitive tests for every status code on every route.

Avoid unit-testing thin route handlers when an API test already covers the behavior.

## Environment

Test environment variables are set in:

```txt
apps/api/tests/setup/env.ts
```

If a new required env variable is added, update the test setup too.

Do not use real secrets in tests.

## TypeScript and ESLint

Backend tests are included in:

```txt
apps/api/tests/tsconfig.json
apps/api/tsconfig.eslint.json
```

If new test paths are added, make sure TypeScript and ESLint still include them.

## Commands

Run:

```bash
pnpm --filter api run test
pnpm --filter api run lint
pnpm --filter api run build
```

`supertest` may require permission to open a local ephemeral listener in sandboxed environments.
