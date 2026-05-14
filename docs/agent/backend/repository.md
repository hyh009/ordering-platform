# Backend Repository

Use this guide when a backend feature reads or writes data.

## Layout

Use one folder per domain:

```txt
apps/api/src/repositories/<domain>/
  repository.ts
  <implementation>.repository.ts
```

Examples:

```txt
apps/api/src/repositories/todo/
  repository.ts
  memory.repository.ts
  mongo.repository.ts
```

Do not create unused implementations unless the starter/demo needs to show a switchable data source.

## Responsibilities

- `repository.ts` defines the repository contract and exports the selected implementation.
- `<implementation>.repository.ts` contains data source specific logic.

`repository.ts` may import multiple implementations when it needs to switch between them.

`repository.ts` should not import Mongoose models directly or contain Mongo queries.

Only `mongo.repository.ts` should import `apps/api/src/models/<domain>/mongo.ts`.

## Model Boundary

Use domain models from:

```txt
apps/api/src/models/<domain>/model.ts
```

Use Mongo models only from:

```txt
apps/api/src/models/<domain>/mongo.ts
```

Local file, memory, or other non-Mongo repositories should import only `model.ts`.

Mongo repositories may import both `model.ts` and `mongo.ts`.

## Starter Default

For starter demo features, prefer the memory repository as the selected implementation.

Mongo repositories may exist to show the production-ready path, but they are not required for every domain.

Routes and services should depend only on the selected repository export from `repository.ts`.
