# Permissions

This document defines who can access what across the platform. It covers route
prefix conventions, the `requireOrgRole` middleware, and per-resource access
boundaries.

For the authentication implementation (login, tokens, session restore), see
`docs/features/auth.md`.

## Authorization Flow

```txt
User
  -> OrganizationMembership (role: org_owner | org_admin | staff)
  -> Organization
  -> Store
```

Store access is resolved through the parent organization membership. Store
permissions are not checked directly in MVP. `staff` members have no store
management access until `StoreMembership` is introduced.

## Route Prefixes

Platform admin and merchant operations are served under separate route prefixes
with separate middleware chains:

- `/api/v1/admin/...` — super admin only; protected by `requireSuperAdmin()`
- `/api/v1/merchant/...` — org members only; protected by `requireOrgRole(...roles)`

Super admin routes and org member routes are never the same route handler with
branching logic.

## requireSuperAdmin Middleware

`requireSuperAdmin()` rejects with `403 Forbidden` if the authenticated user
does not have `isSuperAdmin = true`. Used exclusively on `/api/v1/admin/...`
routes.

## requireOrgRole Middleware

`requireOrgRole(...roles)` resolves the caller's `OrganizationMembership` and
rejects with `403 Forbidden` if the membership does not exist or the role is not
in the allowed list.

Organization resolution:

- Routes with `:organizationId` param — resolved directly from the param.
- Merchant routes with `:storeId` but no `:organizationId` — resolved by
  looking up the store record and reading its `organizationId`.

## Resource Permission Boundaries

| Resource | org_owner | org_admin | staff |
|---|---|---|---|
| OrganizationMembership | CRUD | CRUD | read |
| Store | CRUD | CRUD | read |
| Category | CRUD | CRUD | read |
| Tag | CRUD | CRUD | read |
| ProductModifier | CRUD | CRUD | read |
| Product | CRUD | CRUD | read |
| Promotion | CRUD | CRUD | — |
| Order (management actions) | yes | yes | yes |

Notes:

- Organization creation and deletion remain super-admin-only.
- Cart and order creation is part of the customer ordering flow and does not
  require an org membership check.
- Staff write access to menu resources (e.g. toggling sold-out) is deferred
  until explicitly scoped.
