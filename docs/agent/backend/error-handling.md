# Backend Error Handling Design

## Philosophy

This project follows a simple rule:

```txt
Expected errors → handled and returned to client
Unexpected errors → hidden from client, logged internally
```

---

## Error Types

### 1. AppError (Operational Error)

Used for predictable, business-level errors:

- Validation error
- Resource not found
- Bad request

Example:

```ts
throw new NotFoundError('Product not found');
```

---

### 2. Unexpected Error

Examples:

- Runtime exception
- Database crash
- Undefined access

These should NOT expose internal details.

---

## Error Flow

```txt
Route / Service
→ throw AppError or normal Error
→ (optional) map external errors → AppError
→ errorHandler
→ response to client
```

---

## Error Handling Strategy

### In errorHandler

```txt
if AppError → return message
else → return generic 500 error
```

The errorHandler should remain simple and only handle known application errors.

---

## External Error Mapping

External libraries may throw errors that should be translated into AppError.

Instead of handling them directly in errorHandler, use a mapping layer.

```txt
external error (Zod / Mongo / Mongoose)
→ mapping layer
→ AppError
→ errorHandler
```

### Why mapping is needed

- Avoid coupling errorHandler to specific libraries
- Keep errorHandler simple and maintainable
- Centralize external error handling logic

Use `src/utils/errorMapper.ts` for external-to-`AppError` conversion. Put reusable Mongo error-shape checks, such as duplicate key detection, in `src/utils/mongoError.ts` instead of redefining them in routes or services.

---

## Common Mappings

Examples:

- ZodError → 400 Bad Request / `VALIDATION_ERROR`
- Mongo duplicate key error → 409 Conflict / `RESOURCE_ALREADY_EXISTS`
- Mongoose CastError → 400 Bad Request / `INVALID_ID` or `INVALID_FIELD_VALUE`

Example:

```ts
if (err instanceof ZodError) {
  return new BadRequestError('Invalid request body', 'VALIDATION_ERROR');
}
```

---

## Response Format

```json
{
  "status": "error",
  "statusCode": 400,
  "code": "BAD_REQUEST",
  "message": "Bad request",
  "details": []
}
```

---

## Error Code

`code` is used for programmatic handling.

```txt
message → for humans
code    → for frontend / client logic
details → optional structured error information (e.g. validation details)
```

HTTP status code and application error code have different jobs:

```txt
statusCode → HTTP category, such as 400 or 409
code       → application-specific reason, such as VALIDATION_ERROR or PRODUCT_NOT_FOUND
```

For example, several errors may all return HTTP `400`, but they should still use different `code` values when the frontend needs to distinguish them:

- `BAD_REQUEST`
- `VALIDATION_ERROR`
- `INVALID_ID`
- `INVALID_FIELD_VALUE`

Example:

```json
{
  "status": "error",
  "statusCode": 404,
  "code": "PRODUCT_NOT_FOUND",
  "message": "Product not found"
}
```

### Recommended Format

```txt
DOMAIN_REASON
```

Examples:

- BAD_REQUEST
- NOT_FOUND
- PRODUCT_NOT_FOUND
- PRODUCT_ALREADY_EXISTS
- INTERNAL_SERVER_ERROR

Avoid numeric-only error codes unless explicitly required.

---

## Production Safety

In production, unexpected errors must never expose:

- stack trace
- database errors
- internal logic

Instead, unexpected errors should return:

```txt
Internal Server Error
```

Operational `AppError` instances may return their client-safe message and code because they are expected errors controlled by the application.

---

## Development Mode

In local development, include debugging details:

- stack trace
- full error object

Do not expose full error objects in public, shared, or staging-like environments. If an environment is reachable by users or external systems, treat it like production even if it is not the final production deployment.

---

## When to Add Special Error Mapping

Only add mapping when an external library throws an error that should be converted into a client-safe HTTP response.

Do NOT:

- Add mapping for every error type
- Move business logic into mapping

Unknown errors should remain 500 and be logged internally.

---

## Summary

```txt
Use AppError for all business logic errors
Use mapping to translate external errors into AppError
Keep errorHandler simple and centralized
Avoid exposing internal errors
```
