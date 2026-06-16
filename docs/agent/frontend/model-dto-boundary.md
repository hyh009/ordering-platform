# Model And DTO Boundary

Frontend domain models are usually a `type Model = SomeDto` alias. The real
DTO-to-model boundary is the `model.ts` `deserialize` function, not the type.

- A value that has passed `deserialize` is a model, not a raw DTO. Passing it
  into a store, VM, or view is **not** a leak.
- A leak is using `response.data` or a `*Dto` value directly past the service
  boundary, skipping `deserialize`.
- `deserialize` is the field allowlist. Because the alias accepts a partial
  object, a field left out is silently dropped and reads as `undefined` with no
  type error. Add a field to `deserialize` when the UI starts using it.

Editable domains add `formMapper.ts` (model/DTO → form values) and
`requestMapper.ts` (form values → request). Read-only models need only
`deserialize`.
