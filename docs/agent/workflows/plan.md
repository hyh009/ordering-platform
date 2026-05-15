# Temporary Plan Workflow

Use this guide when a feature or architecture change needs planning before code
changes.

## Location

Put temporary plan files in:

```txt
docs/agent/temp/plan/
```

Do not put permanent instructions in `docs/agent/temp/plan`.

Use `docs/features/` for current feature behavior and architecture after a
decision is agreed.

## File Name

Use a short title and local date/time:

```txt
<short-title>-YYYYMMDD-HHMM.md
```

Example:

```txt
multi-tenant-auth-20260515-1420.md
```

## When To Create A Plan

Create a temporary plan when:

- the feature has multiple possible designs
- schema, API, auth, or frontend boundaries are not settled
- the user wants to compare options before implementation
- work should be split across phases or pull requests
- the plan would make `docs/features/` too speculative

Do not create a plan for small, obvious edits.

## Workflow

- Create the plan file before changing code for the large feature.
- Keep open questions in `Decisions Needed`.
- Move settled direction into `Proposed Direction`.
- Update the plan as discussion changes the design.
- After the user accepts a direction, promote the agreed behavior into the
  permanent docs that own it.

## Plan Contents

Keep plans concise and decision-oriented.

Use this structure:

```md
# Plan Name

## Goal

What this change should achieve.

## Current Context

Relevant existing code, docs, or constraints.

## Decisions Needed

- [ ] Decision or open question.

## Proposed Direction

The recommended approach and why.

## Phases

- [ ] Phase 1
- [ ] Phase 2

## Risks

Important tradeoffs, unknowns, or migration concerns.

## Outcome

Record the final agreed decision before implementation starts.
```

## Boundaries

- Keep secrets, credentials, and local-only values out of plans.
- Do not treat a temporary plan as the source of truth after implementation.
- After decisions are agreed, update the permanent docs that own the final
  behavior, such as `docs/features/`, `docs/schema/`, or `docs/agent/`.
- If a plan becomes obsolete, leave a short outcome note before deleting it.

## Cleanup

Temporary plan files should not be committed unless the user explicitly wants to
preserve the planning history.

Before finishing a planning task:

- confirm whether the user wants to keep, promote, or remove the plan
- update the relevant permanent docs when the plan is accepted
- keep implementation checklists separate from planning docs
