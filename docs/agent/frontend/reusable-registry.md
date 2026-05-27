# Frontend Reusable Registry

Use this guide before adding or changing reusable frontend markers.

## Lookup

Before creating shared or feature-reusable frontend code, check
`docs/generated/reusable-registry.frontend.md` when it exists.

Generated registry scopes:

- `docs/generated/reusable-registry.md` for all workspace scopes.
- `docs/generated/reusable-registry.frontend.md` for `apps/web/src`.
- `docs/generated/reusable-registry.backend.md` for `apps/api/src`.
- `docs/generated/reusable-registry.shared.md` for `packages/shared/src`.

Search with several short terms or synonyms rather than only one exact phrase.

Examples:

```bash
rg -n -i -C 2 "dialog|overlay|confirmation" docs/generated/reusable-registry.frontend.md
rg -n -i -C 2 "delay|search|debounce" docs/generated/reusable-registry.frontend.md
rg -n -i -C 2 "pagination|next cursor|offset" docs/generated/reusable-registry.frontend.md
```

## Marker Format

Reusable exports should use a short JSDoc marker:

```ts
/**
 * @reusable
 * @description Debounce a changing value before reacting to it.
 * @keywords debounce, delay, input, search
 */
export function useDebouncedValue() {}
```

```tsx
/**
 * @reusable
 * @description Accessible form field wrapper with label, description, and error wiring.
 * @keywords field, form, label, error, aria
 */
export function Field() {}
```

Use `@description` for one plain-language sentence.

## What To Mark

Mark the reusable thing an agent should discover before creating a duplicate.

For a compound UI control, prefer one marker on the main export or wrapper that
represents the control. Do not mark every subpart just because it is exported.

Examples:

- Mark `SearchableSelect` because agents may search for a searchable dropdown.
- Mark `Field` because agents may search for label/error/description wiring.
- Mark `Button` because agents may search for a shared action primitive.
- Do not separately mark `SelectContent`, `SelectItem`, `SelectGroup`, or
  similar subparts unless they are commonly imported alone outside the control.

The registry is a discovery index, not a full component API reference.

## Keyword Rules

Use `@keywords` for the words an agent is likely to search when it needs this
reusable item.

Good keywords are:

- Names users or agents would use for the need: `dialog`, `confirmation`,
  `combobox`, `pagination`.
- UI or behavior synonyms: `modal`, `overlay`, `searchable select`,
  `load more`.
- Domain-neutral use cases when helpful: `form field`, `error message`,
  `submit action`.

Avoid keywords that do not help discovery:

- `reusable`, `shared`, `component`, `function`, `utility`.
- Implementation-only details unless agents would search for them directly.
- Generic prop names like `size`, `variant`, `children`, `className`.
- Every word from the symbol name repeated without synonyms.

Prefer 4-8 keywords. Include one exact concept term, then a few synonyms or
common use cases. For example:

```tsx
/**
 * @reusable
 * @description Styled button primitive for user actions.
 * @keywords button, action, submit, trigger, cta, icon button
 */
export function Button() {}
```

After adding or changing reusable markers, run:

```bash
pnpm docs:scan-reusables
```

To update only one scope while iterating, run:

```bash
pnpm docs:scan-reusables --scope frontend
```

Generated registry file entries include the symbol start line in the `File`
field.

Do not edit `docs/generated/reusable-registry.md` manually.
