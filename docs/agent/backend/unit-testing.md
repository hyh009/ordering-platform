# Backend Unit Testing

Use this guide when adding or updating backend unit tests for services or utilities.

## Test Tool

Use `vitest`.

Do not use `supertest` for pure service or utility tests.

## What to Test

Add unit tests for:

- service logic with meaningful branching
- utility functions with edge cases
- data transformations
- permission or state transition logic
- bugs that were fixed

Do not unit-test simple pass-through functions or thin route handlers.

## Test Location

Place backend unit tests under:

```txt
apps/api/tests
```

Use `.test.ts` filenames.

## Pattern

Import the function or class directly.

Example:

```ts
const result = serviceMethod(input);

expect(result).toEqual(expected);
```

Keep tests focused on the unit. Do not start Express or use `createApp()` for unit tests.

## Environment

If the unit imports code that requires env validation, make sure the needed variables are present in:

```txt
apps/api/tests/setup/env.ts
```

Do not use real secrets in tests.

## Commands

Run:

```bash
pnpm --filter api run test
pnpm --filter api run lint
pnpm --filter api run build
```
