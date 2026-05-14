# Backend Swagger

Use this guide when adding or changing backend API routes.

## Rules

- Update OpenAPI docs in the route file when route behavior changes.
- Document request params, query, body, success response, and important errors.
- Use shared schemas for repeated response shapes.
- For error responses, include the HTTP status and concrete `code` examples.
- Do not rely on `message` as the only error contract; frontend logic should use `code`.
- Include validation `details` shape when a route can return `VALIDATION_ERROR`.
- Keep examples close to real runtime responses.
- Do not add tests only to prove Swagger exists.

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
