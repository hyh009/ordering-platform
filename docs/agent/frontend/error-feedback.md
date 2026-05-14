# Frontend Error Feedback

Use this guide when handling frontend API errors.

## Goal

Keep domain errors close to the page or feature that owns them.

For toast and modal presentation, see:

```txt
docs/agent/frontend/shared-feedback-ui.md
```

## Error Flow

```txt
Backend error response
  -> API client normalizes error
  -> Service throws ApiError
  -> Page commands map domain meaning
  -> Page-local form state or feature action writes page/domain error state
  -> View renders inline error
```

## Core Rules

- Do not create a global error store.
- API and service files do not call UI feedback APIs.
- Feature stores keep feature-owned page/domain error state only.
- Feature actions only mutate store state.
- Page commands may map API errors into page-level outcomes.
- Keep catch blocks small: delegate API error mapping to named mapper functions.
- Use inline state when the error is part of the page data.
- For form field errors, follow `docs/agent/frontend/forms.md`.
- Use shared feedback UI only when the error needs toast or modal presentation.

## Feature Checklist

When adding API-backed page behavior:

- Add endpoint paths in `src/api/paths`.
- Add or reuse a service that returns frontend models.
- Let `apiJson` throw `ApiError`; do not catch errors in services.
- Add a named command mapper such as `mapLoadTodoError`.
- Map domain meaning from documented backend `code` values.
- Return a page result from the command when the VM hook needs toast/modal decisions.
- Store feature-owned inline errors in the feature store.
- Keep page-only form field errors in the page-local form hook; see `docs/agent/frontend/forms.md`.

## Placement

```txt
src/
  api/
    apiError.ts
    index.ts

  models/
    apiError.types.ts
```

## API Errors

Before mapping frontend errors, check the backend Swagger/OpenAPI route docs.

Use the documented response contract as the source of truth for:

- possible HTTP status codes
- application error `code` values
- `details` shape, especially validation errors
- whether an error is domain-specific or route-level

Do not guess domain meaning from HTTP status alone.

The backend error response shape is:

```json
{
  "status": "error",
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Invalid request body",
  "details": []
}
```

The API layer should normalize failed requests into an `ApiError`.

Expected normalized failure reasons:

- `network`: browser could not reach the API
- `server`: API returned a 5xx response
- `invalid-response`: API returned malformed or unreadable JSON
- `unknown`: known API error without a generic frontend category

Keep backend response types in `src/models`.

Keep fetch helpers and normalization logic in `src/api`.

Services should return frontend models on success and throw `ApiError` on failure.

## Command Mapping

Avoid writing different inline `catch` styles in every command.

Prefer:

```txt
catch error
  -> mapErrorToResult(error)
  -> page-local form state or feature action updates inline state
  -> return page outcome
```

Use API helpers for generic checks such as network or server failures.

Keep page/domain-specific code mapping in a named command mapper.

Example:

```ts
function mapLoadTodoError(error: unknown): LoadTodoResult {
  if (hasApiErrorCode(error, 'TODO_NOT_FOUND')) {
    return { status: 'not-found' };
  }

  return {
    status: 'failed',
    reason: getApiFailureReason(error),
  };
}
```

## Inline Errors

Use page-local form state for page-only form field and submit errors.

Use feature store state for feature-owned errors that belong to current page data.

Examples:

- list load failed
- detail item not found
- save failed while the form stays open

For form field error shape and ownership, follow `docs/agent/frontend/forms.md`.

Feature-owned store error state may start simple:

```ts
type PageError = string | null;
```

Use a structured error only when the UI needs code or details:

```ts
type PageError = {
  message: string;
  code?: string;
  details?: unknown[];
};
```

## Presentation Decisions

Use inline state when the error is part of the page data.

Use `docs/agent/frontend/shared-feedback-ui.md` when the error needs toast or modal presentation.
