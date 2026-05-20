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
