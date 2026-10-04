## Why

A guest who accepts a proposal and then reloads sees the proposal again, drawn
as a greyed-out record saying "this was an earlier suggestion, ask me again if
you still want it" — while the items it proposed are sitting in the cart beside
it. The panel is telling the guest the opposite of what happened.

The cause is that an outcome is a hitchhiker. The frontend applies the operations
itself, holds the results in memory, and only sends them when the guest sends
their NEXT message. A guest who accepts and then stops talking never reports
anything, so the stored conversation ends with a bare proposal that is
indistinguishable from one nobody acted on. The panel cannot draw it honestly and
the assistant cannot reason about it.

Two consequences follow from the same gap. The assistant learns that an operation
failed — sold out, cart locked — only if the guest happens to speak again, so at
the moment it could most usefully offer an alternative it does not yet know there
is anything to replace. And a proposal that was genuinely never applied cannot
have its apply action restored after a reload, because the server cannot tell
that case apart from the applied one.

Underneath the defect is an architectural decision that no longer holds. The
original design kept execution in the frontend and kept the model loop
hand-written, on the grounds that a server-side apply path bought no safety and
that a framework-owned loop would make the tests integration-shaped. The first
argument understated the cost: the machinery it listed as the price of a
server-side apply — proposal snapshots, proposal ids, partial-failure status —
was built anyway, in the frontend, and the traceability the conversation log was
supposed to provide instead is exactly what has the hole. The second argument is
weaker than it was written: LangChain's own fake model records call counts and
scripted tool calls, so the assertions that argument was protecting survive a
framework-owned loop.

## What Changes

- **BREAKING** The backend executes an accepted proposal's operations. Accepting
  a proposal stops being N cart calls from the browser and becomes one call that
  resumes the paused assistant run. This reverses the original decision that the
  backend never mutates the cart.
- **BREAKING** A proposal may be applied once. A second attempt neither executes
  anything nor reports a new result; getting the operations again means asking
  the assistant for a new proposal.
- The assistant run is built with LangChain's `createAgent`, and the proposal is
  a human-in-the-loop interrupt rather than a response the frontend acts on. The
  hand-written planner loop is replaced; the product logic it composed —
  validation, the single repair retry, the output gate, the quality signals —
  moves into middleware around the model call.
- Execution results are recorded in the same request that produces them, against
  the turn that proposed them, rather than arriving with the guest's next
  message. The outcome of a proposal is therefore known to the server whether or
  not the guest speaks again.
- Because the run is resumed rather than restarted, the assistant can respond to
  what actually happened in the same exchange: a sold-out item can be answered
  with an alternative immediately instead of on the guest's next turn.
- A restored transcript distinguishes an applied proposal, a partially applied
  one, and one that was never acted on. The never-acted-on case keeps its apply
  action after a reload; the others are drawn with their real per-operation
  results.
- The paused run's state is checkpointed with a bounded lifetime. A proposal left
  unanswered past that lifetime expires, and expiry is reported as no action
  rather than as a refusal.
- Partial failure continues not to roll back, and each operation's failure
  reason is reported both to the guest and to the assistant.
- Per-operation retry disappears from the proposal card. Retrying one operation
  against the cart was a way of bypassing the proposal, which a single-use
  proposal no longer permits; the guest asks for a new proposal instead.
- The frontend's apply loop, its failure-scope classification, and its
  client-side outcome bookkeeping are removed. The frontend presents a proposal,
  reports which operations the guest kept, and renders the results the server
  returns.

Deliberately unchanged: the guest still confirms every cart change before
anything is executed, the assistant still has no operation that submits, pays
for, or closes an order, and a guest still cannot act on another participant's
items.

## Capabilities

### New Capabilities

<!-- None. This changes how an existing capability behaves. -->

### Modified Capabilities

- `ai-ordering-assistant`: the assistant endpoint may change the cart, but only
  when resuming a proposal the guest has accepted; a proposal is single-use;
  proposal outcomes are recorded when they happen rather than on the guest's
  next turn, and reach the assistant within the same exchange; an unanswered
  proposal expires on a bounded lifetime. This modifies "Guest assistant turn",
  "Per-operation proposal review", and "Proposal outcomes are reported back to
  the assistant", and adds requirements for single-use proposals and for
  restoring a proposal's state after a reload. "Order submission stays
  human-only", "Shared cart visibility and modification limits", and
  "Confirmation may be skipped only when both the store and the assistant
  version allow it" are unaffected.

## Impact

All three slices change. This is a rewrite of the assistant's execution layer,
not an addition beside it.

`packages/shared`:

- A request and response contract for accepting a proposal, carrying the kept
  operation ids and returning per-operation results plus the resulting cart.
- `previousOutcome` on the send contract becomes unnecessary once outcomes are
  recorded at execution time; its removal is a contract change.

`apps/api`:

- `modules/aiOrdering/planner.ts` — the hand-written loop is replaced by
  `createAgent`.
- `modules/aiOrdering/{outputGate,validation,modelResponse}.ts` — the logic
  survives; where it runs moves into middleware.
- `modules/aiOrdering/tools.ts` — the cart tool becomes an executing tool behind
  a human-in-the-loop interrupt instead of a pure output channel.
- `modules/aiOrdering/runtime/` — model construction gains the agent, the
  middleware stack, and the checkpointer.
- `models/aiOrdering/model.ts` — the stored proposal snapshot gains an applied
  marker; the comment stating there is deliberately no status field is no longer
  true and is replaced with the reason there now is one.
- `services/aiOrdering.service.ts`, `routes/v1/public/guest/aiOrdering.ts` — the
  resume endpoint.
- `services/guestOrdering.service.ts` — called by the executing tool rather than
  only by the guest cart routes. Reused, not duplicated.
- New dependencies: `langchain` and `@langchain/langgraph` beside the existing
  `@langchain/core` and `@langchain/google-genai`, plus a MongoDB checkpoint
  saver.
- A checkpoint collection with its own TTL, separate from the conversation
  collection. The conversation remains the long-lived record for merchant review
  and evaluation; a checkpoint is short-lived execution state.

`apps/web`:

- `features/storeFront/aiOrdering/commands.ts` — the apply loop, the failure
  scope table, and the per-row retry path are removed in favour of one call.
- `features/storeFront/aiOrdering/{store,actions}.ts` — rows carry the server's
  results rather than locally accumulated ones.
- `pages/storeFront/menu/assistantPanelView.ts` — the `stale` record disappears;
  a restored proposal is drawn from the server's recorded state.
- `pages/storeFront/menu/AssistantProposalCard.tsx` — retry controls removed.

Testing: the api suite's model stubbing changes shape, from stubbing a model
caller to scripting an agent's model with LangChain's own fake model. It stays
offline and free of API keys. Assertions that today constrain the hand-written
loop, such as there never being a third model call, are re-expressed as
assertions about recorded call counts.

Sequencing: `ai-ordering-assistant` exists only as the pending delta in the
`add-ai-ordering-assistant` change, which also carries the design decisions this
change reverses. That change, and then `improve-ai-ordering-cart-visibility`,
should be archived before this one so the deltas merge in order.
