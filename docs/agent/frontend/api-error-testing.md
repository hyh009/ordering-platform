# Frontend API Error Testing

Use this guide when testing frontend API error handling.

## Commands

```txt
pnpm --filter web run test
pnpm --filter web run lint
pnpm --filter web run build
```

Use `pnpm --filter web run test:watch` while iterating.

## Scope

- Test API error normalization in `src/api`.
- Test `apiJson` behavior with mocked `fetch` responses.
- Test page command error mapping when backend `code` values affect page behavior.
- Do not treat these as real backend integration tests.
- Keep DOM, component, and E2E testing in a separate guide if those are added later.

## Placement

- Put API client tests beside `src/api` modules.
- Put page command tests beside the page command file.
- Use mocked services when testing commands.
- Do not test store internals through components; test actions/commands directly when possible.

## API Error Checklist

- Copy error fixtures from backend Swagger or backend API tests; do not invent the response shape.
- Backend error envelopes keep `status`, `statusCode`, `code`, `message`, and `details`.
- Network failures map to `network`.
- 5xx responses map to `server`.
- Invalid JSON or unreadable API JSON maps to `invalid-response`.
- Domain behavior uses documented backend `code` values, not only HTTP status.
