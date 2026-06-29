# Manual Testing

Human-run QA checklists for features whose behavior is hard to fully cover with
automated tests (concurrency, real-time sync, multi-window flows, visual state).

These are **not** agent implementation contracts (those live in `docs/agent/`).
Each file is a self-contained checklist: prerequisites, steps, expected results.

## Checklists

- [Merchant order status lifecycle](merchant-order-status-lifecycle.md) — cancel /
  checkout / per-Round advancement / complete / conflict refresh / freshness / SSE.
