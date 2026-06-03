# Troubleshooting QA

Use this when a repeated problem appears during implementation or verification.

## Q: What if `i18n:generate` fails with Google/OAuth DNS or network errors?

A: Treat it as a network/environment blocker first.

- Sandbox failures such as `getaddrinfo EAI_AGAIN oauth2.googleapis.com` usually
  mean the command needs network access.
- Rerun with approval for network access if generation is required.
- If generation still cannot run, report that generated resources were not
  refreshed.
- For Sheet/default ownership, follow `docs/agent/frontend/i18n.md`.

## Q: What if Vite or API tests fail with `listen EPERM`?

A: Treat localhost listen failures as sandbox/environment issues.

- Do not rewrite app code to work around `listen EPERM`.
- Rerun with approval only when the task truly requires a local listener.
- Otherwise report the command and blocker, then rely on lint/build/unit tests.

## Q: How should frontend Zod issue paths be mapped?

A: Zod issue paths may be `PropertyKey[]`.

- Convert path segments with `String(...)` before comparing or joining paths.
- Do not assume path segments are only strings or numbers.

## Q: What if a PATCH update fails on a cross-field Mongoose validator?

A: Treat partial update validators as query-context validators, not document
validators.

- `findOneAndUpdate(..., { runValidators: true })` runs path validators with
  `this` bound to the query, so sibling fields such as `this.minSelect` may be
  unavailable or stale.
- Do not rely on query validators for rules that need the complete document
  state.
- In the service, load the existing record, combine it with the PATCH input,
  validate the complete next state, then issue an atomic repository update.
- If concurrent writes matter, pass a condition such as
  `updatedAt: existing.updatedAt` into `findOneAndUpdate`; when no document is
  updated, return `409 Conflict`.
- Keep schema/document validation for create/save paths, but make cross-field
  validators skip query-update context or use document-only validation.
