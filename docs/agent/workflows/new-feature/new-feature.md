# New Feature Workflow

Use this guide when the user asks you to add a new feature or extend existing behavior.

## Purpose

This is the entry workflow for new features.

Use the more specific workflow when the feature clearly touches only one side:

- Backend only: `docs/agent/backend/route-development.md`
- Frontend only: `docs/agent/frontend/feature-development.md`

For full-stack features, start here, then do backend work before frontend work unless the user asks for a different order.

## Clarify First

- Ask concise clarification questions before implementation when the request is vague or has multiple reasonable interpretations.
- Clarify user-facing behavior, data shape, permissions, persistence, API contract, and edge cases when they affect the implementation.
- Clarify testing expectations when behavior is non-trivial: automated coverage, important edge cases, and manual checks.
- Keep asking until the implementation no longer has conflicting interpretations or unclear behavior.
- Do not ask for clarification when the request is already specific and the implementation path is clear from these docs.
- If a small assumption is enough to proceed, state the assumption and continue.

## Planning Gate

Before implementation, decide whether the feature needs a temporary plan.

Use `docs/agent/workflows/plan.md` first when:

- schema, API, auth, permissions, or frontend boundaries are not settled
- the feature has multiple reasonable designs
- the work should be split across phases or pull requests
- putting the discussion in `docs/features/` would make feature docs too speculative

Do not create a plan for small, obvious edits.

When a plan is needed:

- create it under `docs/agent/temp/plan/`
- keep open questions and tradeoffs in the plan
- wait until the user accepts a direction before changing implementation code
- promote agreed behavior into the permanent docs that own it after decisions are settled

## Decide Scope

- Classify the feature as:
  - Backend only
  - Frontend only
  - Full-stack
- Check whether the feature changes:
  - API request or response shape
  - environment variables
  - package dependencies
  - README or setup docs
- Use the matching workflow file after classification.
- Keep unrelated cleanup out of the change.

## Full-Stack Order

Use this order when a feature needs both API and Web changes:

1. Use `docs/agent/backend/route-development.md` first.
2. Define backend behavior with the frontend use case in mind.
3. Verify backend behavior.
4. Use `docs/agent/frontend/feature-development.md`.
5. Run full-stack verification.

## Dependencies

Add a package only after choosing the implementation approach.

- Check whether existing dependencies or platform APIs are enough.
- Prefer small, established packages for real gaps.
- Confirm the package name and reason with the user before installing it.
- Follow `docs/development/install.md` when adding dependencies.
- Update setup docs when installation or runtime behavior changes.

## Documentation

Update docs only when behavior, setup, or required commands changed.

- Before adding or updating docs, tell the user which docs should change and why.
- Get user approval before making documentation changes that were not explicitly requested.
- Update `README.md` when user-facing setup, scripts, env vars, ports, or routes change.
- Update `docs/development/install.md` when installation or local setup changes.
- Use `docs/agent/workflows/feature-docs.md` when the user asks to create or update feature docs.
- Update agent docs only when future agents need a new rule to work correctly.
- Keep agent-facing docs short and execution-oriented.

## Verification

Follow `docs/agent/workflows/verification.md`.

## Finish

Before responding:

- Summarize what changed.
- Do not create a commit unless the user explicitly asks.
- If the user asks for a commit, follow `docs/agent/workflows/git-commits.md`.
