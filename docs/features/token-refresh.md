# Token Refresh

## Overview

Access tokens are short-lived (15 minutes). When an API call receives a 401,
the frontend automatically attempts a silent token refresh using the HTTP-only
refresh token cookie. If the refresh succeeds, the original request is retried
with the new access token. If the refresh fails, the auth state is cleared and
the user is redirected to login.

## Flow

```
API call → 401 response
  └─ deduplicatedRefresh()
       ├─ success → retry original request with new token
       └─ failure → authActions.authAnonymous() → RequireAuth redirects to login
```

## Key Behaviors

**Automatic retry.** The caller (service, command, page VM) does not need to
handle 401 or know that a refresh occurred. The retry is transparent.

**Deduplicated refresh.** If multiple requests receive 401 simultaneously, only
one refresh call is issued. All waiting requests share the same refresh promise
and retry once it resolves.

**No retry loop.** A retried request that receives a second 401 throws
immediately without attempting another refresh (`isRetry` flag).

**Opt-out via `skipRefresh`.** Auth-related endpoints pass
`{ skipRefresh: true }` to `apiJson` to bypass the API client's automatic
401 refresh handling:

- `refresh` — is itself the refresh call; recursion must be prevented
- `login` — a 401 means invalid credentials or login failure; it should not trigger silent refresh
- `logout` — should clear the cookie regardless of access token state

## Code Locations

| Layer | File | Responsibility |
|-------|------|----------------|
| API client | `src/api/index.ts` | 401 interception, `deduplicatedRefresh`, `setApiRefreshHandler` |
| Auth commands | `src/app/global/auth/auth.commands.ts` | Registers refresh handler; calls `authActions.authSuccess` or `authActions.authAnonymous` |
| Auth service | `src/services/auth.service.ts` | Calls refresh endpoint with `skipRefresh: true` |
| Auth guard | `src/app/routing/RequireAuth.tsx` | Redirects to login when `authStore.status` becomes `anonymous` |

## Logout and Cookie Cleanup

The logout endpoint (`POST /v1/auth/logout`) does not require a valid access
token. It reads the refresh token from the HTTP-only cookie, revokes the
session record, and clears the cookie unconditionally — so logout works even
when the access token is already expired.

## Adding `skipRefresh` to a New Endpoint

Pass the option as the third argument to `apiJson`:

```ts
const response = await apiJson<MyResponse>(
  myPath,
  { method: 'POST', body: JSON.stringify(input) },
  { skipRefresh: true },
);
```

Use `skipRefresh: true` for any call where a 401 should be treated as a
terminal failure rather than an opportunity to silently re-authenticate.
Common examples include auth endpoints and public endpoints where a 401 is
expected business behavior.
