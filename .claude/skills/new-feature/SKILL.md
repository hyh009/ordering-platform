---
name: new-feature
description: This skill should be used when the user asks to "add a new feature", "implement a new page", "build X functionality", "create a new feature", "extend existing behavior", "add X to the frontend", "add X to the backend", or describes a new product capability to implement. It enforces reading the correct workflow and domain docs before any implementation begins.
---

# New Feature

Guided workflow for adding or extending a feature in this codebase.
Read the correct docs before writing any code. Do not skip or batch phases.

---

## Phase 0 — Read the entry workflow

Read `docs/agent/workflows/new-feature/new-feature.md` in full before doing
anything else. This covers clarification rules, planning gate, and scope
classification.

---

## Phase 1 — Clarify and classify scope

If the scope is not already clear from the user's request, ask:

- Which surfaces does this feature touch — backend only, frontend only, or
  both?
- What user-facing behavior is expected?
- Are there any known API contract changes, permission requirements, or edge
  cases?

Classify the feature as one of:

- **Backend only** — proceed to Phase 2B.
- **Frontend only** — proceed to Phase 2F.
- **Full-stack** — do backend work first (Phase 2B), then frontend (Phase 2F).

Do not begin implementation until scope is confirmed.

---

## Phase 2B — Backend: read the contract

Read `docs/agent/backend/route-development.md` in full.

If a step requires deeper guidance on a specific pattern (e.g. error handling,
logging, mongo schema), consult `docs/agent/index.yaml` under the `backend:`
section to find the relevant guide.

Create one task per checklist step before starting any backend work:

1. Shared contracts
2. MongoDB schema
3. Repository
4. Service
5. Route handler
6. OpenAPI docs
7. Error handling
8. Tests
9. Verification

---

## Phase 2F — Frontend: read the contract

Read `docs/agent/frontend/feature-development.md` in full.

If a step requires deeper guidance on a specific pattern (e.g. pagination,
searchable select, design system, shared components), consult
`docs/agent/index.yaml` under the `frontend:` section to find the relevant
guide.

Create one task per checklist step before starting any frontend work:

1. Shared contracts
2. Models
3. Services
4. State
5. Commands
6. Page VM
7. i18n
8. Forms (mark not applicable if the feature has no user input forms)
9. View
10. Tests
11. Verification

---

## Phase 3 — Execute each step

For every task:

1. Set status to `in_progress` with TaskUpdate before starting the step.
2. Review whether the step requires changes for this feature:
   - If changes are needed, make only the changes relevant to this feature.
     Do not touch existing code unrelated to the current task.
   - If no changes are needed, record why and move on.
   - If the step does not apply, record the skip reason.
3. Set status to `completed` with TaskUpdate before moving to the next step.
4. Do not start the next step until the current task is marked `completed`.

For full-stack features, complete all backend tasks before starting frontend
tasks.

---

## Phase 4 — Report

After all tasks are complete, report:

- Files changed and what changed in each.
- Any steps skipped and why.
- Verification result.
- Manual checks needed for UI changes.
