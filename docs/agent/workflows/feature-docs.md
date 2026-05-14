# Feature Documentation

Use this guide only when the user asks to create or update feature documentation, or when the user approves it during feature work.

## Location

Feature docs live under:

```txt
docs/features/
```

Use one file per domain feature:

```txt
docs/features/auth.md
docs/features/todo.md
```

Do not create feature docs automatically.

## When to Update

Create or update a feature doc when:

- the user asks for feature documentation
- the user approves a documentation update during feature work
- the feature is a named domain capability that future agents will need to understand

Before editing, tell the user which feature doc should change and why.

## Template

```md
# Feature Name

## Purpose

What user-facing capability this feature provides.

## Code Map

List the main files future agents should read first. Do not list every import, generated file, or incidental helper.

Backend:

- `apps/api/src/routes/v1/...`
- `apps/api/src/services/...`
- `apps/api/tests/...`

Frontend:

- `apps/web/src/pages/...`
- `apps/web/src/features/...`
- `apps/web/src/services/...`
- `apps/web/src/models/...`

## Backend

Routes, services, data model, auth, and important behavior.

## Frontend

Pages, feature folders, services, models, and main UI states.

## API

Endpoint, method, request shape, response shape, and important errors.

## Data

Persistent data model, ownership, lifecycle, and validation rules.

## Notes

Important decisions, constraints, or known follow-ups.
```

## Style

- Keep docs factual and current.
- Prefer concise bullets.
- Document current behavior, not implementation history.
- Include only decisions or constraints that affect future work.
- Keep code maps short enough to stay maintainable.
