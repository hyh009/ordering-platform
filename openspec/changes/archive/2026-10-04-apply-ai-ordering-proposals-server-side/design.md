## Context

See `proposal.md` — Why. This design does not restate the defect.

What matters here is the shape being replaced. `add-ai-ordering-assistant`
decision 1 put execution in the browser and decision 14 kept the model loop
hand-written; decision 19 followed from both, making tool calls a pure output
channel that never executes. The three held each other up. Reversing the first
makes the other two negotiable, and the user has asked for LangChain's
`createAgent` specifically.

Current state this design builds on, all of it already in place:

- `modules/aiOrdering/planner.ts` (223 lines) composes one model call, an output
  gate, validation, at most one repair retry, and quality-signal collection.
- `modules/aiOrdering/tools.ts` defines `propose_cart_operations`,
  `ask_choice`, and `report_unanswerable` as the model's output channel.
- `models/aiOrdering/model.ts` stores one turn per request, including a proposal
  snapshot whose comment states there is deliberately no status field.
- `services/guestOrdering.service.ts` already performs every cart mutation the
  assistant can propose, under the same guest claims.
- The api suite runs offline by stubbing an `AiOrderingModelCaller`.

Guides this design follows: `docs/agent/backend/architecture.md`,
`docs/agent/backend/route-development.md`, `docs/agent/backend/mongo-schema.md`,
`docs/agent/backend/repository.md`, `docs/agent/backend/swagger.md`,
`docs/agent/backend/error-handling.md`,
`docs/agent/backend/throwing-errors.md`,
`docs/agent/backend/unit-testing.md`, `docs/agent/backend/api-testing.md`,
`docs/agent/workflows/shared-contracts.md`,
`docs/agent/frontend/architecture.md`, `docs/agent/frontend/commands.md`,
`docs/agent/frontend/state-ownership.md`,
`docs/agent/frontend/model-dto-boundary.md`,
`docs/agent/workflows/verification.md`.

One intentional deviation is called out in decision 7: the checkpoint collection
is written by a library, not by a repository, so it does not follow
`docs/agent/backend/repository.md` or `docs/agent/backend/mongo-schema.md`.

`packages/shared` contracts change. See decision 9.

## Goals / Non-Goals

**Goals:**

- An accepted proposal's outcome is recorded by the same request that causes it.
- The assistant can speak to what actually happened in the same exchange.
- A reloaded conversation can be drawn honestly in every proposal state.
- The frontend stops owning execution, failure classification, and outcome
  bookkeeping.
- Tests stay offline, free of API keys, and free of provider cost.

**Non-Goals:**

- Letting the assistant act without confirmation beyond the existing store and
  version setting. The confirmation gate is untouched.
- Menu retrieval tools, which stay deferred for the reason recorded in
  `add-ai-ordering-assistant` decision 2.
- Streaming, still deferred.
- Dish photos or product cards in the conversation.
- Multi-step agent behavior. The run is still one proposal, one decision; this
  design adopts the agent framework for its interrupt and resume machinery, not
  to let the model plan over many steps.

## Decisions

### 1. The proposal is a tool-call interrupt; resuming it is the apply endpoint.

The assistant run is built with `createAgent` and
`humanInTheLoopMiddleware({ interruptOn: { propose_cart_operations: ... } })`.
The model calls the tool, the middleware pauses the run before the tool executes,
and the paused state is checkpointed. `POST /chat` returns the proposal as it
does today. A new endpoint resumes the run with the guest's decision; the tool
then executes against `guestOrdering.service`, and the agent continues.

This is one mechanism doing four jobs that would otherwise each need building:
pausing before a cart change, surviving the gap between proposing and deciding,
executing once on resume, and letting the model see the tool result.

Alternative considered: a plain apply endpoint that re-reads the stored proposal
snapshot and calls the cart service in a loop, with no agent framework. It is
less machinery and it closes the defect. Rejected because it does not give the
model the result within the same exchange — the thing that makes a failed
operation answerable rather than merely reported — and because the user asked
for `createAgent` directly.

Alternative considered: keeping the hand-written loop and adding our own
pause/resume on top of the stored proposal snapshot. That is re-implementing
interrupts with a worse vocabulary.

### 2. Per-operation dismissal is an `edit` decision, not N separate tool calls.

One proposal is one `propose_cart_operations` call carrying an operations array,
which is how the response contract and the stored snapshot already model it.
Dismissing some operations is therefore an edit of the tool's arguments, so the
middleware is configured with `allowedDecisions: ["approve", "edit", "reject"]`.

The client sends operation ids only, never operation content. The backend
rebuilds the edited arguments from the stored proposal snapshot, keeping the
named ids and dropping the rest. A caller cannot smuggle in an operation the
assistant never proposed, or change one it did.

Alternative considered: one tool call per operation, so each maps to its own
approve/reject decision. Rejected because it breaks the proposal into pieces that
the response contract, the stored snapshot, and the per-proposal outcome record
all treat as one unit, and because it gives the model more ways to emit a
malformed set.

### 3. The run's thread id is the proposal id.

Each `POST /chat` turn starts a fresh run. Only a run that interrupts needs to
survive the request, and it is identified by exactly one thing the guest will
come back with: the proposal id.

This makes three properties fall out rather than be enforced:

- Single use — the checkpoint for a proposal id is consumed on resume, so a
  second resume has no paused run to continue.
- Bounded lifetime — a per-proposal TTL on the checkpoint is the proposal's
  lifetime.
- Isolation — two guests, or two proposals from one guest, cannot collide.

Single use is still asserted explicitly rather than inferred from the checkpoint
being gone, because "already decided" and "expired" must stay distinguishable
(spec: "Expiry is not a refusal"). The authority for that is the applied marker
in decision 5, not the checkpointer.

### 4. The checkpoint is execution state; the conversation stays the record.

Two stores, deliberately, with different jobs and different lifetimes:

- The conversation collection is the long-lived record — merchant review,
  evaluation corpus, transcript restore. Unchanged in role.
- The checkpoint collection holds a paused run so it can be resumed. It is
  written by `@langchain/langgraph`, carries a TTL (24 hours, matching the
  proposal lifetime), and nothing reads it except the resume path.

Nothing a guest or merchant ever sees is read from a checkpoint. If the
checkpoint collection were dropped, pending proposals would expire and
everything already recorded would be intact.

Alternative considered: a custom checkpointer backed by the conversation
document, so there is one store. Rejected: it couples our persistence shape to a
library's internal checkpoint format, and that format is not ours to keep stable.

### 5. The applied marker lives on the stored proposal snapshot.

`AiOrderingProposalSnapshot` gains the outcome: when it was decided, and each
operation's result. Its comment stating there is deliberately no status field is
replaced with the reason there now is one — the backend executes, so replay is
something to guard against.

Claiming it is an atomic conditional update: the decision is recorded only if no
decision is recorded yet. The resume runs only for the request that won. Two
concurrent acceptances therefore execute once, with the loser refused as already
decided, without depending on the checkpointer's own concurrency behavior.

### 6. Resume costs one more model call, and the budget is per run.

A run is at most two model calls before the interrupt (one, plus the repair
retry) and one after resume, so the model can answer what actually happened.
That third call is the feature, not an accident: it is how a sold-out item
becomes an alternative instead of a red line.

It is also a cost. The call happens only on a resume that executed something, so
a rejected or expired proposal does not pay for it.

The existing assertion "there is never a third model call" is re-expressed as a
per-phase budget, asserted on the fake model's recorded call count.

### 7. Validation stays ours and runs before the guest sees anything.

Middleware order matters and is fixed: the model answers, our middleware runs the
output gate, validation, and at most one repair retry, and only then does the
human-in-the-loop middleware see a tool call worth interrupting on. A proposal
that fails validation never becomes an interrupt.

`outputGate.ts`, `validation.ts`, and `modelResponse.ts` keep their logic and
their tests; what changes is the caller. Quality signals are collected in the
same middleware that already sees both attempts.

The deviation from `docs/agent/backend/repository.md` and
`docs/agent/backend/mongo-schema.md` is here: the checkpoint collection has no
repository, no model folder, and no hand-written schema, because the library owns
its shape. It is configuration, not a domain collection.

### 7b. Three refinements the agent shape forces.

Derived while building decision 1, recorded because they are not obvious from it:

**The middleware rewrites the tool call's arguments to the hydrated proposal.**
The model is deliberately not allowed to emit `proposalId`, `operationId`, or
`confirmationRequired` (`add-ai-ordering-assistant` decision 18), but the
executing tool and the guest's edit both work on operation ids. So after the gate
and validation, the middleware replaces the tool call's arguments with the
hydrated, validated proposal. The interrupt, the client, and the execution then
all read one set of backend-issued ids.

**A non-proposal tool call ends the run instead of executing.** `ask_choice` and
`report_unanswerable` are output channels with nothing to execute, and letting
the agent run them would feed a tool result back and call the model again. The
middleware jumps to the end of the run for those, so only
`propose_cart_operations` ever reaches a tool node. Our middleware is listed
AFTER the human-in-the-loop middleware for this to work: `afterModel` hooks run
last to first, so the later-listed middleware decides first.

**The closing call after a resume binds no tools.** Once the cart has changed,
the model's job is to say what happened. Binding the tools again would let it
propose a second time inside a run that has already been decided, which
single use forbids. Unbinding them makes that unrepresentable rather than
policed, and makes the call budget exact: at most two before the interrupt, and
exactly one after.

### 8. The resume endpoint carries the same limits as the chat endpoint.

Rate limiting, concurrency refusal, and the store-open and cart-active checks
apply to the resume endpoint too. It calls the model and mutates the cart, so it
is at least as privileged as `POST /chat`.

The exception is the conversation turn ceiling: a resume continues an existing
turn rather than starting one, so it is not counted against it. Refusing a guest
the ability to finish a proposal they were already shown would strand them.

### 9. Shared contracts: one added, one removed.

Added: the decision request — a proposal id and the kept operation ids — and its
response, carrying each operation's result, the resulting cart, and the
assistant's reply.

Removed: `previousOutcome` on the send contract, and with it the relaxation
`message` would have needed. Outcomes no longer travel with a later message, so
the field has no remaining producer. This is a **BREAKING** contract change
handled by `docs/agent/workflows/shared-contracts.md`.

`AiOrderingOperationResult` is unchanged and keeps its four outcomes. Only who
produces it moves.

### 10. The frontend stops classifying failures and starts rendering them.

Removed: the apply loop, `APPLY_FAILURE_SCOPE`, the per-row retry path, and the
client-side outcome accumulation. One call sends the kept ids and writes the
server's results onto the rows.

Kept: `FAILURE_KIND_BY_REASON` in `assistantPanelView.ts`, which maps a reason
code to guest-facing wording. That is presentation and is unaffected by who
executed.

The `stale` proposal record disappears. A restored proposal is drawn from the
state the server recorded, so the three cases in the spec are each drawable.

The apply overlay stays. It now covers one request instead of several, and the
response carries the resulting cart, so the surface unblocks on a cart the server
confirmed rather than on a loop finishing.

Per-operation retry is removed rather than reworked. Retrying one operation was
a second execution of a single-use proposal; the guest asks the assistant
instead, which is also the path that gets them a currently-valid alternative.

## Risks / Trade-offs

- [The prompt prefix must stay stable for implicit caching, and `createAgent`
  assembles the message array] → The agent is given the system instruction and
  the context blocks in the order `add-ai-ordering-assistant` decision 15
  defines, and no middleware reorders or injects ahead of them. A test pins the
  message order recorded by the fake model, so a reordering regression fails
  rather than silently costing cache hits.

- [A library now owns the loop, so an upgrade can change termination or
  tool-calling behavior] → The budget assertions run against the fake model's
  recorded call count, so a behavior change fails a test instead of reaching
  production. This is the risk accepted in exchange for not maintaining the loop.

- [The checkpoint saver depends on the v6 MongoDB driver while Mongoose 9 ships
  v7, so the application's client cannot be shared] → The checkpointer opens its
  own client to the same database rather than passing one across a driver major
  on a type assertion. The pool is lazy, so a deployment with the assistant
  disabled never opens it, and it is closed on shutdown. This is an added
  dependency the proposal did not anticipate.

- [A new persistence store, and with it a new way to leak storage] → TTL on the
  checkpoint collection, and nothing outside the resume path reads it. Verified
  by the same index test that already pins the conversation collection's indexes.

- [Execution moves behind a tool, so a bug there mutates carts rather than
  proposing] → The tool executes only operations present in the stored proposal
  snapshot, reached only through `guestOrdering.service`, under the guest's own
  claims. Every ownership and cart-state rule that protects the guest cart routes
  protects this path unchanged, because it is the same path.

- [Partial failure is now a single response, so "it worked" is less obvious than
  a loop advancing] → The response reports every operation's result and the
  resulting cart. The spec requires the three states to be distinguishable, and
  the assistant's reply in the same response speaks to what failed.

- [The third model call can fail after the cart has already changed] → The cart
  change is committed and the outcome is recorded before the model is called
  again. A failure there degrades to the results without a closing reply; it
  never unwinds the cart or loses the record.

- [This is a rewrite of a slice that was finished and committed] → The spec is
  written first and the behavioral requirements that survive are copied forward
  unchanged, so the rewrite is checked against the old contract rather than
  against memory.

## Migration Plan

No data migration runs. The user has confirmed there is no production data for
this capability: the branch has never been deployed, so no stored conversation,
proposal, or outcome needs to survive this change. Consequences:

1. `reportedOutcomes` is removed from the stored turn rather than kept readable.
   The field exists only because outcomes used to arrive with a later message,
   and with no old turns holding one there is nothing to preserve.
2. Pending proposals from the old flow are not a case to handle. The absence of
   a resumable run still means expired, but that path exists for proposals this
   design itself leaves unanswered, not for legacy ones.
3. Shared contracts, then api, then web — the order the tasks follow.
4. Rollback is a revert of all three slices together, since the contract change
   is breaking.
5. The assistant remains optional. A deployment with it disabled is unaffected
   by every part of this change.
