# Agent Instructions

This repository is a pnpm workspace for a multi-tenant ordering platform.

Workspace layout:

- `apps/api` is the Express + TypeScript API.
- `apps/web` is the React + Vite frontend.
- `packages/shared` contains shared API contracts, DTOs, and schemas used
  across workspace packages.

## First Step

Before changing this repository, read:

```txt
docs/agent/index.yaml
```

Use that registry to choose the smallest relevant guide for the task. Treat the
`docs/agent/*` files as the active implementation contract, and keep them short,
execution-oriented, and non-duplicative when editing them.

## Product Direction

- The product is a multi-tenant ordering platform with platform users,
  organizations, organization memberships, and ordering-related domains.
- Platform super admin access is represented by `isSuperAdmin`.
- Super admins create organizations and select an existing active user as the
  initial organization owner.
- User and organization records use soft delete where appropriate. Business
  lifecycle state must remain separate from deletion state.
- `shared` means project-wide, cross-domain reuse. Do not move code into shared
  locations only because it is used twice in one feature area.

## Architecture Rules

- Backend changes belong under the API architecture in
  `docs/agent/backend/architecture.md`.
- Frontend changes follow:

```txt
View -> Page VM Hook -> Page Commands -> Feature Actions -> Feature Store | Service -> API
```

- Frontend views should not call stores, services, or commands directly.
- Page VM hooks own React lifecycle, page-local state, and command-result
  reactions such as navigation or modal feedback.
- Commands compose async flows. Feature actions mutate feature stores. Stores
  hold state only.
- Raw API DTOs should not leak into frontend pages, commands, actions, stores,
  or views. Convert through `src/models/<domain>` and service/model mappers.
- Shared API contracts that cross app boundaries belong in `packages/shared`;
  backend entity-to-DTO mappers stay in backend model folders.

## Worktree Rules

- Inspect the current worktree before editing.
- Do not revert or overwrite user changes unless the user explicitly asks.
- Keep edits scoped to the requested task and the relevant architecture guide.
- Do not create commits unless the user explicitly asks.
- When committing is requested, follow `docs/agent/workflows/git-commits.md`
  and the repo-local focused commit skill referenced there.
- Keep `docs/agent/temp/` and reference artifacts out of normal staging unless
  the user explicitly includes them.

## Verification

Before finishing code or documentation changes, follow:

```txt
docs/agent/workflows/verification.md
```

Use the narrowest useful lint, test, build, or docs check for the touched slice.
For frontend code changes, also run the frontend architecture validation guide.
Do not start API, web, preview, or full dev servers by default; start them only
when the user asks or the task cannot be verified without one.

Use Context7 MCP to fetch current documentation whenever the user asks about a
library, framework, SDK, API, CLI tool, or cloud service.
