## Why

Several behaviors of the ordering assistant were implemented and committed after
the four existing changes without a change of their own, so the specs now
contradict the code: they still describe a single repair with at most two model
calls, a lapsed proposal recorded as `no_action`, and a model that reads full
ids. This change records what already ships so the specs can be archived as a
true account of the system.

## What Changes

Everything below is already implemented, tested and committed on
`feat/ai-ordering-assistant`. This change adds no code.

- A proposal belongs to the turn that made it. The guest's next message settles
  an unanswered proposal, and the turn response reports what it settled.
- A proposal's lifetime is described as what a guest can actually meet: it ends
  with the ordering session and the cart, not on a timer of its own. The earlier
  requirement described an expiry no guest can reach.
- Never answering a proposal is its own outcome, `superseded`, separate from
  `no_action` (accepted, but an earlier failure stopped the proposal first).
- Each reported outcome tells the assistant what the operation proposed, not
  only its identifier.
- A past proposal shows its recorded outcome in the transcript, not only on the
  live card.
- Repair is bounded at three model calls. The first two may propose; the third
  cannot, and is used to tell the guest what could not be done. The reply the
  model wrote beside a failed proposal is never shown.
- When that third call yields nothing usable, the guest receives a fixed system
  notice in the language they wrote in.
- An accepted operation that loses a concurrent cart write is retried before it
  counts as a failure.
- The assistant reads and writes short codes in place of full identifiers.
- Merchant review shows what the model answered, and is reachable from the
  merchant navigation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ai-ordering-assistant`: validation and repair, proposal outcomes, proposal
  lifetime, merchant review, and the model-facing identifiers all change as
  listed above.

## Impact

- No code, API or dependency change: the behavior is already in place.
- `packages/shared`: the `superseded` outcome and `settledProposal` on the turn
  response already exist in the shared AI ordering contract.
- `apps/api`: `modules/aiOrdering` (planning middleware, context assembly, cart
  execution, short codes) and `services/aiOrdering.service.ts`.
- `apps/web`: the storefront assistant transcript and the merchant conversation
  review pages.
- Archive order: this change modifies requirements introduced by the four
  earlier changes, so it must be archived after all of them.
