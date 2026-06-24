# Frontend Error Mapping

Turn a backend error into a typed failure `{ status: 'failed', reason, message }`.
This is the single source of truth for "what kind of failure is this". For what
to do with that failure — presentation and where error state lives — see
`docs/agent/frontend/error-feedback.md`.

```txt
API response ──normalize──▶ ApiError ──classify──▶ reason ──wording──▶ message
   (src/api)                            (src/services/utils)
```

## The idea: `reason` groups failures we treat the same

A `reason` is the frontend's own label for "a kind of failure handled the same
way". Many backend codes collapse into one reason; that reason then carries one
message and one default behavior.

```txt
backend codes  ─┐
no-code cases  ─┼─→  reason  ─┬─→  one message
(network, race) ┘            └─→  one default behavior (toast / navigate / clear / ignore)
```

- Group codes under one reason when you want to treat them the same.
- Split into separate reasons only when the message or behavior must differ
  regardless of which page you are on.
- When the same reason should behave differently on one page (context, not the
  error itself), that page handles it — do not add a new reason. The standard
  action-vs-load contexts (page already shows data vs primary load failing) are
  expressed as two axes in the presentation table, not a new reason; see
  `docs/agent/frontend/error-feedback.md`. Only finer, page-specific context
  stays in the page.

## Normalize: API response → ApiError

Before mapping, check the backend Swagger/OpenAPI route docs. Use the documented
response as the source of truth for status codes, `code` values, and `details`
shape. Do not guess domain meaning from HTTP status alone.

```json
{
  "status": "error",
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Invalid request body",
  "details": []
}
```

The API layer (`src/api`) normalizes every failed request into an `ApiError`
with these infrastructure reasons:

- `network` — browser could not reach the API
- `server` — API returned a 5xx response
- `invalid-response` — malformed or unreadable JSON
- `unknown` — an API error with no generic frontend category

Services return frontend models on success and throw `ApiError` on failure; they
never catch errors for display. Keep response types in `src/models`.

## Two tables per domain

Build each domain mapper from two typed tables, not hand-written `if` chains.

```ts
import { type ErrorCode } from '@repo/shared';

// 1. classify: code -> reason. Keyed by ErrorCode, so each code is classified once.
const CODE_REASON: Partial<Record<ErrorCode, Reason>> = {
  STORE_NOT_FOUND: 'not-found',
  ORDER_NOT_FOUND: 'not-found',
  STORE_NOT_OPEN: 'store-closed',
  // ...
};

// 2. wording: reason -> message. Exhaustive Record, so one reason has one message.
const MESSAGES: Record<Reason, { key: string; fallback: string }> = {
  'not-found': { key: 'guest.errors.notFound', fallback: 'This was not found.' },
  // ...
};
```

`classifyApiError(error, CODE_REASON)` looks up the code, and falls back to the
shared infrastructure reasons (`network` / `server` / `unknown`) for anything
not listed. The mapper is then a few lines:

```ts
export function mapAreaApiError(error: unknown): AreaCommandFailure {
  const reason = classifyApiError(error, CODE_REASON);
  const message = MESSAGES[reason];
  return { status: 'failed', reason, message: tDefault(message.key, message.fallback) };
}
```

Because a code reaches one reason and a reason reaches one message, the same
error can never drift into several different i18n keys.

## Placement

```txt
src/
  api/apiError.ts          # normalize: API response -> ApiError
  services/utils/
    classifyApiError.ts    # shared: code -> reason fallback (network/server/unknown)
    <area>ApiError.ts      # the two tables + mapper, one per area
```

## Rules

- Import codes from `@repo/shared`; never retype string literals. A wrong code
  must fail to compile.
- `classifyApiError` only resolves the infrastructure fallbacks
  (`network` / `server` / `unknown`). Code families such as `VALIDATION_ERROR`,
  `403`, `*_NOT_FOUND`, and `*_ALREADY_EXISTS` are not handled by the shared
  helper — list them in the domain's table 1.
- Reuse an existing reason before adding one. Add a reason only when message or
  behavior must differ regardless of page. A page handling a known reason
  differently is page-specific work, not a new reason. Adding a reason is a
  cross-page contract change: when one seems genuinely unavoidable, discuss it
  with the user before adding it.
- Never write `tDefault('<domain>.errors.*', ...)` outside a wording table.
- Page-specific reactions (navigate, clear session, field error) live in
  the page or command, not the mapper.

> An area still using a legacy `if` / `Set` mapper should be migrated to the two
> tables above.
