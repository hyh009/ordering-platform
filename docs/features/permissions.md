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
with separate middleware chains. Prefixes are actor surfaces, not resource
grouping labels:

- `/api/v1/admin/...` — super admin only; protected by `requireSuperAdmin()`
- `/api/v1/merchant/...` — org members only; protected by `requireOrgRole(...roles)`

Super admin routes and org member routes are never the same route handler with
branching logic.

Actor-specific operations should stay under the actor prefix even when the
resource name is generic. For example, super-admin organization management
belongs under `/api/v1/admin/...`, while organization-member store or menu
management belongs under `/api/v1/merchant/...`; do not move these operations to
top-level resource paths only because the resource is named `organizations`,
`stores`, or `products`.

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

| Resource                   | org_owner | org_admin | staff |
| -------------------------- | --------- | --------- | ----- |
| OrganizationMembership     | CRUD      | CRUD      | read  |
| Store                      | CRUD      | CRUD      | read  |
| Category                   | CRUD      | CRUD      | read  |
| Tag                        | CRUD      | CRUD      | read  |
| ProductModifier            | CRUD      | CRUD      | read  |
| Product                    | CRUD      | CRUD      | read  |
| Promotion                  | CRUD      | CRUD      | —     |
| Order (management actions) | yes       | yes       | yes   |

Notes:

- Organization creation and deletion remain super-admin-only.
- Cart and order creation is part of the customer ordering flow and does not
  require an org membership check.
- Staff write access to menu resources (e.g. toggling sold-out) is deferred
  until explicitly scoped.

## Frontend Permission Gating

The backend is always the authority — every merchant route is protected by
`requireOrgRole(...)`. The frontend mirrors the same boundary as a UX layer so
read-only users do not see actions that would only fail with `403`. This is
defense-in-depth, not the enforcement point: bypassing the UI still hits the
server check.

### Source of truth

The active user's role for the active organization is derived from the auth
session, not refetched per page:

- `apps/web/src/app/global/auth/auth.store.ts` holds `user.memberships`
  (`{ organizationId, organizationName, role }[]`) from the login/refresh
  response.
- `apps/web/src/app/global/activeOrg/activeOrg.store.ts` holds the active
  `organizationId`.
- `apps/web/src/app/global/activeOrg/useActiveOrgRole.ts` joins the two:
  - `useActiveOrgRole()` → the current `OrganizationMembershipRole | null`.
  - `useCanManageStoreResources()` → `true` only for `org_owner` / `org_admin`
    (`staff` is read-only). This encodes the management boundary in one place;
    change the allowed roles here, not per page.

### Read-only mode pattern

Merchant management pages that allow editing must support a read-only mode for
`staff`:

1. The page VM calls `useCanManageStoreResources()` and returns `canManage`.
2. The view hides mutating affordances when `!canManage`:
   - the create/primary action button is not rendered;
   - the row "Actions" column (edit/delete) is omitted;
   - edit dialogs are unreachable because their only triggers are hidden.
3. List/detail reads stay visible to all members.

Reference implementation: `apps/web/src/pages/merchant/tagList/` (VM exposes
`canManage`; `TagListPage.tsx` conditionally renders the create button and the
actions column). Apply the same pattern to category, product modifier, product,
and store settings pages.

Staff are not blocked from the management pages themselves — they view content;
only editing is hidden. Routes are not role-gated at the router level for this.
