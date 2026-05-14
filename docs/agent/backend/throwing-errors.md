# Backend Throwing Errors

## Purpose

This document defines how backend application code should throw errors.

Error handling is covered separately in `error-handling.md`.

```txt
throwing-errors.md → how code should throw errors
error-handling.md  → how thrown errors are mapped and returned
```

---

## Core Rule

Application code should throw `Error` instances only.

Use:

```ts
throw new BadRequestError('Invalid input');
throw new Error('Unexpected failure');
```

Do not use:

```ts
throw 'Invalid input';
throw { message: 'Invalid input' };
throw null;
throw undefined;
```

Non-Error thrown values do not reliably provide:

- `message`
- `stack`
- error type information
- `instanceof` checks

---

## Expected Errors

Use `AppError` subclasses for predictable application errors.

Examples:

```ts
throw new BadRequestError('Invalid request body');
throw new NotFoundError('Product not found');
throw new ConflictError('Product already exists');
```

Expected errors are safe to return to clients when their messages and codes are controlled by the application.

Use expected errors for:

- validation failures
- missing resources
- duplicate resources
- invalid identifiers
- permission failures

---

## Unexpected Errors

Use normal `Error` for unexpected failures.

Example:

```ts
throw new Error('Failed to connect to database');
```

Unexpected errors should become generic `500 Internal Server Error` responses in production.

Do not expose unexpected error messages to clients.

---

## External Errors

Errors from external libraries should not be converted at the throw site unless the application owns the decision.

Prefer:

```txt
external library throws error
→ error mapper converts it to AppError when appropriate
→ error handler returns response
```

This keeps route and service code from depending on library-specific error shapes.

Examples of errors that may be mapped:

- ZodError
- Mongo duplicate key error
- Mongoose CastError

---

## Unknown Thrown Values

Even though application code should throw only `Error` instances, runtime error handling must still treat incoming thrown values as `unknown`.

JavaScript allows throwing any value:

```ts
throw 'error';
throw { message: 'error' };
throw null;
```

Rules:

- Do not assume `err.message` exists.
- Do not assume `err.stack` exists.
- Treat non-Error thrown values as unexpected errors.
- In production, return generic `500 Internal Server Error`.
- In local development, raw thrown values may be included only in debug-only response fields.

---

## Promise Rejections

Rejected promises should reject with `Error` instances.

Use:

```ts
return Promise.reject(new Error('Unexpected failure'));
```

Do not use:

```ts
return Promise.reject('Unexpected failure');
```

Rejected non-Error values should be handled the same way as non-Error thrown values.

---

## Summary

```txt
Use AppError subclasses for expected application errors
Use Error for unexpected failures
Do not throw strings, plain objects, null, or undefined
Treat incoming thrown values as unknown at runtime boundaries
Map external library errors in the error mapper, not in the error handler
```
