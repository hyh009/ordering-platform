# Auth

## Purpose

Auth provides account registration, login, logout, protected routes, and session
restoration after browser reloads.

The ordering platform will evolve into a multi-tenant system with three frontend
platform surfaces:

- ordering platform: users can operate within one selected organization and may
  switch between organizations they belong to.
- management platform: organization owners, admins, and staff manage one
  organization.
- super admin platform: platform administrators manage organizations and
  platform-wide operations.

## Code Map

Backend:

- `apps/api/src/routes/v1/auth.ts`
- `apps/api/src/services/auth.service.ts`
- `apps/api/tests/auth.test.ts`

Frontend:

- `apps/web/src/app/auth.commands.ts`
- `apps/web/src/app/stores/auth.store.ts`
- `apps/web/src/app/viewModel/useAuthVM.ts`
- `apps/web/src/app/RequireAuth.tsx`
- `apps/web/src/pages/login`
- `apps/web/src/pages/register`
- `apps/web/src/services/auth.service.ts`
- `apps/web/src/models/auth.model.ts`

Shared contracts:

- `packages/shared/src/contracts/auth.ts`

Temporary multi-tenant planning:

- `docs/agent/temp/plan/multi-tenant-auth-20260515-1522.md`

## Token Model

```txt
Access token
  -> returned in API response JSON
  -> stored in frontend memory auth store
  -> sent as Authorization: Bearer <token>
  -> lost on browser reload

Refresh token
  -> set by backend as an HttpOnly cookie
  -> automatically sent by the browser
  -> not readable by frontend JavaScript
  -> rotated during session refresh
```

## Login / Register

```txt
User submits credentials
  |
  v
Frontend calls POST /auth/login or POST /auth/register
  |
  v
Backend validates credentials
  |
  +--> returns accessToken + user in JSON
  |
  +--> sets refresh token as HttpOnly cookie
  |
  v
Frontend stores accessToken + user in authStore memory
  |
  v
Authenticated UI
```

## Normal API Requests

```txt
Frontend has accessToken in memory
  |
  v
API client adds Authorization: Bearer <accessToken>
  |
  v
Backend validates accessToken
  |
  v
Protected API succeeds
```

## App Bootstrap / Session Restore

Browser reload clears memory state, so the access token is gone. The refresh token may still exist in the HttpOnly cookie, but frontend JavaScript cannot read it.

```txt
App starts
  |
  v
authCommands.initialize()
  |
  v
POST /auth/refresh
  |
  v
Browser automatically sends refresh cookie
  |
  +--> success:
  |      - backend rotates refresh cookie
  |      - backend returns accessToken + user
  |      - frontend stores session in authStore
  |      - auth status = authenticated
  |
  +--> failure:
         - frontend clears auth state
         - auth status = anonymous
```

`initialize()` deduplicates concurrent refresh calls so React StrictMode cannot send two simultaneous refresh requests during local development.

## Logout

```txt
User clicks logout
  |
  v
Frontend calls POST /auth/logout
  |
  v
Browser sends refresh cookie
  |
  v
Backend invalidates refresh session and clears cookie
  |
  v
Frontend clears accessToken + user from memory
  |
  v
Navigate to /login
```

## Route Behavior

`App` starts session restoration through `useAuthVM().initialize()`.

`RequireAuth` reads auth state through `useAuthVM()`:

- `checking`: show loading state
- `authenticated`: render protected route
- `anonymous`: redirect to `/login`

Public login/register routes also read auth state so authenticated users can be redirected away from public auth pages.

## Multi-Tenant Direction

Auth is planned to support one platform user across multiple organizations.

Current agreed direction:

- use `Organization` as the tenant boundary
- use a dedicated membership model for organization-scoped roles
- keep platform-wide permissions separate from organization-scoped permissions
- platform super admin is represented by `isSuperAdmin`; regular registered
  users default to `false`
- organization roles are `org_owner`, `org_admin`, and `staff`
- organization creation belongs to the super admin platform; a super admin
  creates an organization and assigns an existing user as `org_owner`
- user and organization soft delete metadata is managed by the
  `mongoose-delete` plugin; `status` is for business states such as `active`
  and `disabled`
- soft delete `deletedBy` stores the platform user id string that performed the
  delete
- regular registration creates only a platform user identity and does not create
  an organization
- organization and membership schema/collection naming uses camelCase, such as
  `organizationMemberships`
- do not replace Todo with menu/order schemas until tenant ownership is settled

Detailed schema drafts, token tradeoffs, and open decisions live in the
temporary plan linked above until they are agreed.

## Notes

- Frontend cannot check whether a refresh token exists because it is an HttpOnly cookie.
- `POST /auth/refresh` is the reliable session restoration check.
- `GET /auth/me` would require an access token, which is lost after browser reload because access tokens are memory-only.
- Auth UI code should use `useAuthVM`; React views should not call `authCommands` or `authStore` directly.
- Todo replacement should wait until the tenant model is agreed, because menu
  and order data should belong to an organization.
