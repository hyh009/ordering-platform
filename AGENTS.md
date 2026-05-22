# Agent Instructions

This is an ordering platform built from a React + Express TypeScript starter
using pnpm workspaces.

The workspace contains `apps/api` for the Express API and `apps/web` for the React/Vite app.

The starter is only an architecture and workflow reference. Do not preserve
starter demo data, starter domain assumptions, or backward compatibility with
old starter-only shapes unless the user explicitly asks for it.

Current product direction:

- Multi-tenant ordering platform with platform users, organizations, and
  organization memberships.
- Platform super admin is represented by `isSuperAdmin`.
- Super admins create organizations and select an existing active user as the
  initial organization owner.
- User and organization records use soft delete where appropriate; business
  lifecycle state remains separate from deletion state.

Before changing this repository, start with:

```txt
docs/agent/index.yaml
```

Use the YAML registry to choose the smallest relevant guide for the task.

Do not create commits unless the user explicitly asks.

Use Context7 MCP to fetch current documentation whenever the user asks about a
library, framework, SDK, API, CLI tool, or cloud service.
