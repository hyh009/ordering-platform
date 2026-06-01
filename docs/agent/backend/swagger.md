# Backend Swagger

Use this guide when adding or changing backend API routes.

## Rules

- Update OpenAPI docs whenever route behavior, path, params, query, body,
  response shape, or important errors change.
- Put operation docs next to the route handler that owns the operation.
- Put shared OpenAPI component schemas in `_openapi.ts` near the route subtree
  that owns them.
- Keep root `_openapi.ts` limited to components shared by that route subtree.
  Nested resources such as `memberships/` or `stores/` should keep their own
  `_openapi.ts`.
- Use shared schemas for repeated response shapes. Do not duplicate component
  names across `_openapi.ts` files because OpenAPI component names are global.
- Document request params, query, body, success response, and important errors.
- For error responses, include the HTTP status and concrete `code` examples.
- Do not rely on `message` as the only error contract; frontend logic should use `code`.
- Include validation `details` shape when a route can return `VALIDATION_ERROR`.
- Keep examples close to real runtime responses.
- Prefix actor-surface tags with the actor, such as `Admin / Organizations`,
  so admin-only resources do not collide with public or merchant resources in
  Swagger UI.
- Do not add tests only to prove Swagger exists.

## Placement

For a route tree like:

```txt
routes/v1/admin/organizations/
  _openapi.ts
  index.ts
  [organizationId]/
    index.ts
    memberships/
      _openapi.ts
      index.ts
```

Use this ownership:

- `organizations/index.ts` documents operations for `/v1/admin/organizations`.
- `organizations/[organizationId]/index.ts` documents operations for
  `/v1/admin/organizations/{organizationId}`.
- `memberships/index.ts` documents operations for
  `/v1/admin/organizations/{organizationId}/memberships`.
- `organizations/_openapi.ts` contains Organization components shared by the
  organization route subtree.
- `memberships/_openapi.ts` contains membership components and responses.

## Tags

- Prefix actor-surface tags with the actor:
  - `Admin / Organizations`
  - `Admin / Stores`
  - `Admin / Users`
- Use a separate tag when nested resources are independently meaningful, such
  as `Admin / Organization Memberships`.
- Do not use frontend page names as Swagger tags. Tags describe API actor
  surface and backend resource ownership.

## Operations

Each operation should include:

- full API path, including `/v1`
- HTTP method
- actor-prefixed `tags`
- short `summary`
- `security` when auth is required
- path params
- query params
- request body
- success response schema
- expected error responses with concrete `code` examples

Use `{param}` in OpenAPI paths even when Express uses `:param`:

```yaml
/v1/admin/organizations/{organizationId}/stores/{storeId}:
  get:
    tags:
      - Admin / Stores
```

## Error Examples

For each expected error response, include an example payload:

```yaml
404:
  description: Todo not found
  content:
    application/json:
      schema:
        $ref: '#/components/schemas/ErrorResponse'
      examples:
        todoNotFound:
          value:
            status: error
            statusCode: 404
            code: TODO_NOT_FOUND
            message: Todo not found
```
