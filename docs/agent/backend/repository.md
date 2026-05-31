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

Do not create unused implementations unless the current project needs to show a
switchable data source.

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

## Entity Mapping

Repositories must return domain entities, not Mongoose documents or persistence
metadata.

When a Mongo repository maps a Mongo result to a `<Domain>Entity`, use an
explicit entity-field allowlist with a compile-time coverage check:

```ts
const entityKeys = [
  'id',
  'createdAt',
  'updatedAt',
] as const satisfies readonly (keyof DomainEntity)[];

const entityKeyCoverage: Record<
  Exclude<keyof DomainEntity, (typeof entityKeys)[number]>,
  never
> = {};

function toDomainEntity(entity: DomainEntity): DomainEntity {
  void entityKeyCoverage;

  return Object.fromEntries(
    entityKeys.map((key) => [key, entity[key]]),
  ) as DomainEntity;
}
```

**Why this pattern instead of a plain object literal:**

A plain object literal with return type `DomainEntity` only enforces required
fields. Optional fields can be silently dropped and TypeScript will not
complain. The `entityKeyCoverage` object uses `Exclude<keyof DomainEntity, ...>`
which covers all fields — required and optional — so adding any new field to the
entity fails to compile until the mapper explicitly handles it.

Use the mapper for legacy-data defaults, null normalization, or validation when
stored records may be older than the current entity shape. When a mapper needs
per-field type coercion or normalization, a plain object literal is appropriate
instead.

## Default

For temporary demo features, prefer the memory repository as the selected
implementation.

Mongo repositories may exist to show the production-ready path, but they are not required for every domain.

Routes and services should depend only on the selected repository export from `repository.ts`.
