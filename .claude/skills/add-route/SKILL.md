---
name: add-route
description: Step-by-step guided workflow for adding or changing an API route handler. Enforces the route-development checklist by tracking each step as a task.
---

# Add Route

Guided workflow for adding or changing an API route in `apps/api`.
Every step is tracked as a task. Do not skip or batch steps.

---

## Phase 0 — Read the contract

Read `docs/agent/backend/route-development.md` in full before doing anything else.
This is the authoritative reference for every step below.

---

## Phase 1 — Clarify scope

If the route being added or changed is not already clear from the user's request, ask:

- What HTTP method and path?
- What actor surface (admin / merchant / public)?
- Any known request/response shape?

Do not begin implementation until the scope is confirmed.

---

## Phase 2 — Create tasks

Use TaskCreate to register one task per checklist step before starting any work.

Create exactly these tasks in order:

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

## Phase 3 — Execute each step

Every step must be reviewed. Not every step needs to be modified.

For every task:

1. Set status to `in_progress` with TaskUpdate before starting the step.
2. Review whether the step requires changes for this route:
   - If changes are needed, make only the changes relevant to this route.
     Do not touch existing code that is unrelated to the current task.
   - If no changes are needed, record why (e.g. "no new shared contracts",
     "repository already has the needed method") and move on.
   - If the step does not apply at all (e.g. no persistent data for step 2),
     record the skip reason.
3. Set status to `completed` with TaskUpdate before moving to the next step.
4. Do not start the next step until the current task is marked `completed`.

---

## Phase 4 — Report

After step 9 is complete, report:

- files changed and what changed in each
- any steps skipped and why
- verification result
