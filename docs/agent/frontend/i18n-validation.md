# Frontend I18n Validation

Use this checklist when reviewing frontend i18n keys, ownership, and reuse.

## Review Flow

1. Decide the scope first.
   - If the request already names a scope, use it.
   - If no scope is given, pick the smallest practical slice or ask only when the task would be noisy without one.
   - Prefer a bounded scope such as a page, feature folder, or `src/app/*` slice when that keeps the review focused.
2. Run `i18n:scan` for the scope.
   - Confirm the keys and default strings are literal.
   - Confirm duplicate keys do not have different defaults.
   - Use the JSON output when you need to inspect file locations.
   - Treat `i18n:scan -- --scope ...` as optional, not required; use it only when a narrower scan will make the review clearer.
3. Review keys by ownership region.
   - Start with `src/app/*`.
   - Then review `src/shared/*` and shared `common.*` candidates.
   - Then review page and feature folders in the chosen scope.
4. Check whether each key matches its semantic owner.
   - Keep app shell, routing, loading, error, and global feedback text under `app.*`.
   - Keep cross-domain reusable text under `common.*`.
   - Keep page or feature text under the owning surface namespace.
5. Look for reuse candidates.
   - If a string is used in multiple unrelated places, prefer one shared key.
   - If a string is only page-specific, keep it local.
   - If the meaning differs, do not merge keys just because the English text matches.
6. Record the result as one of three outcomes.
   - No change needed.
   - Rename or move a key to a better namespace.
   - Extract a new shared key and update the callers.

## Region Order

Review regions in this order:

1. `src/app/*`
2. `src/shared/*`
3. `src/pages/login`, `src/pages/userHome`, `src/pages/notFound`
4. Other `src/pages/*`
5. `src/features/*`

## What To Flag

- A key whose namespace does not match its owner.
- A shared string that is duplicated across pages or features.
- A shared component using a page-local key.
- A page-local key that should really be `common.*` or `app.*`.
- A key whose default text changed but whose meaning did not, unless the translation sheet also needs the update.

## What To Ignore

- Default text wording changes that do not affect ownership.
- App-specific labels that are correct even if they look generic, such as `Home` in a route-specific context.
- `i18n:scan` output noise outside the chosen scope.
- A request that omits scope when the surrounding context already makes the review slice obvious.

## Common Outcomes

- `app.*` for shell, routing, loading, error, and global feedback.
- `common.*` for reusable actions, table labels, fields, errors, pagination, and address labels.
- Domain namespaces such as `auth.*`, `home.*`, `notFound.*`, `admin.*`, or `feature.*` for surface-owned text.

## Related Files

- `docs/agent/frontend/i18n.md`
- `apps/web/scripts/scan-i18n.mjs`
- `apps/web/scripts/i18n-utils.mjs`
