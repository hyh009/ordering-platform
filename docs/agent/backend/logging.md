# Backend Logging

Use the existing backend logger from `@src/utils/logger`.

Do not use `console.log` for application logs.

## Logger

The backend logger is implemented with `pino`.

- Production logs must be structured JSON.
- Local development may use `pino-pretty`.
- `pino-pretty` must not be used outside local development.
- Use `LOG_LEVEL` for verbosity. Default: `info`.

## Request ID

Every request must have a `requestId`.

Rules:

- Reuse the incoming `x-request-id` header only when it is a safe string with reasonable length.
- Generate `crypto.randomUUID()` when the incoming value is missing or unsafe.
- Store the value on `req.requestId`.
- Return the value in the response `x-request-id` header.
- Include the value in request logs and error logs.

## Request Logging

Log exactly one completion event per HTTP request.

Include:

- `requestId`
- `method`
- `path`
- `statusCode`
- `durationMs`

Do not log full request bodies.

Levels:

```txt
5xx             → error
401 / 403 / 429 → warn
other 4xx       → info
2xx / 3xx       → info
```

## Error Logging

Do not log every expected `AppError` as an application error.

Rules:

- Unexpected errors and 5xx responses → `error`
- Security-sensitive `AppError` responses such as `UNAUTHORIZED` or `FORBIDDEN` → `warn`
- Routine 4xx `AppError` responses such as `VALIDATION_ERROR`, `INVALID_ID`, `NOT_FOUND`, or `CONFLICT` → no extra application error log

Expected 4xx responses are still visible through request logs.

Error logs should include:

- `requestId`
- `method`
- `path`
- `statusCode`

Do not log sensitive data or full request bodies.

## Sensitive Data

Never log:

- passwords
- access tokens
- refresh tokens
- authorization headers
- cookies
- full request bodies
- secrets or connection strings

Prefer explicit, small log objects over logging entire request, response, or error payloads.

## Do Not Add Yet

Do not add these unless explicitly requested:

- log rotation
- external transports
- OpenTelemetry
- metrics
- audit logs
- userId or orgId propagation
