## Context

See `proposal.md` - Why for motivation.

What already exists and shapes this design:

- Guests hold a guest token carrying `storeId`, `cartId`, and `participantId`.
  Through `POST /v1/public/guest/cart/items`, `PATCH /items/:itemId`, and
  `DELETE /items/:itemId` a guest can already add, change, and remove their own
  cart items, with full product, modifier, sold-out, and ownership validation.
- A cart is shared: several participants edit one cart. `CartItemSnapshot`
  records `addedByParticipantId`.
- A guest SSE stream already pushes full cart snapshots to every device in the
  session, so any cart mutation propagates without extra work.
- The frontend already owns the whole cart mutation path through
  `cartCommands` (`addItem` / `updateItem` / `removeItem`).
- A cart stays active after a round is submitted, so an order and a draft cart
  coexist for add-on rounds.
- Allergens and dietary markers are platform-level controlled vocabularies;
  products carry `allergenIds` and `dietaryMarkerIds`.

This design follows `docs/agent/backend/architecture.md` (routes stay thin,
service facade in `services/`, internal capability in `modules/aiOrdering/`,
persistence split across `models/` and `repositories/`),
`docs/agent/backend/route-development.md`, `docs/agent/backend/mongo-schema.md`,
`docs/agent/backend/repository.md`, `docs/agent/workflows/shared-contracts.md`,
and on the web side `docs/agent/frontend/architecture.md`,
`docs/agent/frontend/code-placement.md`, and
`docs/agent/frontend/state-ownership.md`. No intentional deviation.

**packages/shared changes: yes.** A new AI ordering contract module for the
turn request/response, and one added store settings field for the auto-apply
toggle. Model-facing schemas are backend internals and stay out of shared - the
model boundary is not an app boundary.

## Goals / Non-Goals

**Goals:**

- One model call per turn on the normal path.
- A proposal the guest accepts is a proposal that will succeed.
- Every turn is reproducible enough to compare prompt versions later.
- The assistant is removable: with it disabled, no other flow changes.

**Non-Goals:**

- Server-side cart mutation by the assistant.
- Agent loops, tool calling, or retrieval over the menu.
- Any accuracy or quality threshold. This change builds the mechanism and the
  corpus; judging answer quality needs a real provider and comes later.

## Decisions

### 1. One endpoint. The backend never mutates the cart.

`POST /v1/public/guest/ai-ordering/chat` loads the menu and cart, calls the
model once, validates, persists the turn, and returns. Accepting a proposal is
the frontend calling the existing `cartCommands`.

Alternative considered: a `plan` endpoint plus an `apply` endpoint that executes
server-stored operations. Rejected because it buys no safety. The guest can
already perform exactly these mutations through the guest cart API with the same
identity and the same validation, so a server-side apply path adds machinery
(stored plan snapshots, plan ids, replay guards, partial-failure status) to
protect against something the guest is already allowed to do. What that design
actually buys is traceability, which the conversation log provides more cheaply.

Alternative considered: LangChain's `humanInTheLoopMiddleware`, which is built
for exactly this approval shape. Rejected because its preconditions are the
things this design avoids. It requires `createAgent` with bound tools (against
decisions 2 and 14), a checkpointer plus thread id to suspend and resume a run,
and on approval it executes the tool SERVER-side, which is decision 1 inverted.
Its interrupt model also assumes a suspended run waiting to be resumed, while a
guest may answer a proposal seconds later or never - leaving abandoned
checkpoint state, with its own lifetime and cleanup, behind every unanswered
proposal.

The deeper mismatch is what the gate is for. That middleware gates PRIVILEGE:
its examples are `send_email`, `delete_database`, `execute_sql` - things the
user cannot or should not do unattended. Here the guest can already perform
every operation the assistant proposes, so the confirmation card gates INTENT.
The two look identical on screen and need entirely different machinery. It
becomes the right tool if the assistant ever gains abilities the guest lacks,
such as applying discounts or acting on another participant's items - a new
change, not a patch to this one.

Consequence: the cart is mutated by the existing path only, so cart validation,
optimistic concurrency, and SSE stay authoritative and untouched.

### 2. One model call per turn. Tools are the output channel; menu retrieval is deferred.

The menu and the guest's cart are assembled into the prompt. Tools are bound to
the model, and the model answers by calling one of them:

```txt
  propose_cart_operations   -> a proposal
  ask_choice                -> a choice question
  report_unanswerable       -> cannot answer, with a reason
  plain text reply          -> a message
```

**The tool call IS the turn's final answer.** Nothing executes, no result is
returned into the model, and the turn ends. The proposal still goes to the
frontend for the guest to accept, so decisions 1 and 17 are untouched.

An earlier version of this decision deferred tool calling as a whole. That was a
misreading on our side: two separate things were collapsed into one.

- **Menu retrieval tools stay deferred.** The reasoning is that even with
  retrieval the model realistically needs every product NAME up front to pick a
  sensible search term, so it does not remove the menu from the prompt - it
  removes part of it and adds a loop. Where that line falls needs real menus and
  real traffic, neither of which exists yet.
- **Cart and choice tools were never the thing being deferred.** They were
  expected from the start, and expressing them as tools rather than as a JSON
  response schema is what this decision now settles.

When menu retrieval is designed, it becomes a NEW version compared against the
old one on the same corpus, which is what decision 8 exists to support. The tool
argument schemas do not change when that happens - only whether a result is fed
back - so the two steps are independent.

### 3. Validate before showing, with at most one repair retry.

Four checks run against data already in memory: the product exists, it is not
sold out, required modifier selections are present and valid, and any
`update`/`remove` targets an item the guest added. On failure the model is told
which operation failed and why, and is called once more. A second failure drops
the offending operations and degrades to a plain reply.

Alternatives considered:

- No plan-time validation, letting the existing cart API reject on accept.
  Rejected: in a confirm-then-accept flow the accept button is a promise, and an
  accept that fails is the worst outcome in the whole interaction.
- An unbounded repair loop. Rejected: a model that still gets it wrong after an
  explicit correction has a version defect, not a transient error, and further
  attempts only add latency.

Repair frequency and post-repair failure rate are recorded. They are the primary
quality signal for comparing versions.

### 4. Four response types.

`message`, `choices`, `proposal`, `unanswered`. A `choices` response always
permits free text: the guest may ignore the options and type, and the next turn
tells the model the guest did not choose and what they typed instead.

`unanswered` carries a machine-readable reason. The first one is "the menu data
does not contain this information", which turns the log into a list of products
the merchant should describe better rather than just a record of failure.

### 5. Proposal outcome is reported on the next turn. Input is never locked.

The next request may carry `previousOutcome` with a per-operation result of
`accepted`, `rejected`, `no_action`, or `failed`.

**The card is per-operation, not all-or-nothing.** Each proposed operation is
listed on its own row with its own dismiss control, and one apply action at the
bottom runs whatever rows remain. Dismissing a row reports that operation as
`rejected`; applying reports each remaining operation individually as `accepted`
or `failed`; typing instead of applying reports every remaining operation as
`no_action`. Dismissing every row resolves the proposal with no apply action
available, which is the same outcome as rejecting it whole.

After applying, the card shows the per-operation result rather than one combined
status, so the guest can see exactly which items reached the cart and which did
not.

This makes partial application a first-class outcome rather than an error path,
and it keeps the two ways of reaching it distinct: the guest deliberately
dropped an operation, or an operation failed on execution. The four outcome
values already separate these, and neither the UI nor the report to the model
may collapse them back together - "you removed the tea" and "the tea failed"
should not produce the same next reply.

The channel exists to carry rejections. Acceptances need no channel: the item is
in the cart, and the cart is in the next turn's context anyway.

`no_action` and `rejected` are deliberately distinct. Typing while a proposal is
pending marks that proposal expired, not rejected - the guest moved on rather
than refusing, so the model may still re-propose it if the new message implies
it. A proposal also expires once a newer assistant response arrives, because
acting on a stale proposal risks a cart that has since changed.

Alternative considered: disabling the text input while a proposal is pending.
Rejected on consistency - a `choices` response explicitly allows typing instead
of choosing, so locking input for proposals would give one interaction pattern
two rules - and because it breaks the common "and also add a tea" case, forcing
a reject the guest did not mean.

The only moment input is blocked is while an accept request is in flight, which
is a loading state, not a policy.

### 6. Auto-apply is a store setting expressed as a response flag.

The store setting resolves server-side; the response carries the resolved flag;
the frontend either renders accept/reject or calls the same cart commands
immediately. The backend still mutates nothing.

A version config also declares whether it may be auto-applied at all, and the
effective mode is the AND of the two. A new prompt version therefore defaults to
requiring confirmation for every store until it has been validated, so a version
experiment cannot silently weaken a store's confirmation step.

### 7. Shared cart: read everything, change only your own.

The assembled context lists the guest's own modifiable items separately from
other participants' read-only items, rather than relying on a prompt sentence to
convey the rule. Violations are filtered by decision 3 and recorded, because
violation rate is a version signal.

The existing cart API remains the real enforcement point; plan-time filtering
exists to protect the guest's experience, not to protect the data.

### 8. Prompts and runtime settings are versioned in code, never in the database.

One file per released version under `modules/aiOrdering/versions/`, never edited
after release. The active version is selected by env. Every stored turn records
its `versionId`, the model name, and the raw model output.

Alternative considered: prompts stored in the database with a backstage editor.
Rejected because it loses code review and diffs, and invites editing a released
version - which destroys the baseline that the whole comparison exercise depends
on.

The registry alone does not deliver the goal. Replay does: a script runs stored
real user messages against a chosen version and model. Replay uses a **frozen
menu fixture**, not live store data, so a difference in output is attributable to
the prompt or the model rather than to a menu that changed in between. The
fixture must include a sold-out product, a sold-out modifier option, required and
optional modifiers, a product with no modifiers, and several similarly named
products.

### 9. The system prompt has three layers; only the first is versioned.

Core instructions live in code and are versioned. Store data (menu, cart, store
information) is read from the database and assembled per turn. Store-authored
custom rules are a later addition, deliberately out of scope here.

Neither the store data nor future store rules are snapshotted per turn. Replay
targets the system prompt and the mechanism, not tenant data, so exact
reproduction of a past turn is explicitly not a goal.

When store-authored rules do arrive they must be bounded and clearly delimited:
they are supplementary guidance written by customers, which makes them an
injection surface, and the core instructions must state that they can never
widen the set of permitted operations.

### 10. The conversation continues; summarization only bounds the context.

One conversation per `(storeId, cartId, participantId)`. Past a turn threshold,
older turns are compressed into a rolling summary that is sent to the model in
place of their full text. Every turn is still stored in full: the log and the
replay corpus need the originals, so compression never deletes.

Whether a cart survives submission depends on the store's checkout mode, per
`docs/features/ordering-flow.md`:

- `pay_later` (dine-in): the cart is a reusable per-round draft. Submitting
  flushes its items into a new order batch and clears them, but the cart stays
  `active` while add-ons are still allowed. An order and a draft cart coexist,
  so the assembled context must present BOTH the submitted batches and the
  current draft cart - otherwise "the thing I ordered earlier, one more please"
  has nothing to resolve against.
- `pay_first`: submitting sets the cart to `checked_out`, and an add-on starts a
  separate cart and order.

Conversation lifetime therefore equals cart lifetime. Under `pay_later` the
conversation spans every add-on round, which is the continuity that matters.
Under `pay_first` an add-on begins a new conversation, which is acceptable
because it is a separate order placed by an anonymous guest whose
`participantId` has also changed; there is no identity to carry a conversation
across.

### 11. Conversations outlive the cart and are read in the merchant backstage.

Carts self-delete on a TTL index; a conversation must not, since retention is the
point. Merchant-scoped read routes live under `/v1/merchant/`, so a store reads
its own conversations only.

This means store staff can read guest conversation text. That is acceptable for
dietary preferences and ordering chatter; it is a further reason allergen
declarations stay out of this change.

### 12. Indexes on the conversation collection.

`docs/agent/backend/mongo-schema.md` requires agreeing indexes with the user
first. Both below were reviewed and approved:

- `{ storeId: 1, cartId: 1, participantId: 1 }`, unique - the lookup performed
  on every turn, and the database-level guarantee that one participant has
  exactly one conversation.
- `{ storeId: 1, createdAt: -1 }` - the merchant review list, newest first,
  scoped to one store.

No TTL index: carts self-delete, conversations must not (see decision 11).

### 13. Streaming is deferred to a later version.

A `proposal` or `choices` response cannot be rendered until its payload has
parsed, so streaming only ever benefits a plain `message` reply - one of the
four response types, albeit likely a common one for dish questions.

Deferred rather than rejected, on cost: it needs a streaming transport instead
of this change's single JSON endpoint, incremental JSON parsing on the server,
turn persistence held until the stream completes, and a frontend path that
abandons progressive rendering when the type turns out not to be `message`.
That is a second delivery path through an already large change.

One objection turned out not to apply: the repair retry (decision 3) validates
cart operations, and a plain `message` carries none, so streaming a reply can
never be followed by a retry that retracts text the guest already read.

**How the type is identified early:** on the tool path this comes for free. The
tool NAME is the discriminator and it arrives before its arguments, so an
incremental parser knows the response type without any ordering rule.

The API contract still declares `type` as the first property of every response
variant, which matters for a client parsing the HTTP response progressively. It
is no longer what makes the model's own output identifiable early - decision 2
replaced the JSON response schema with tool calls, and a tool call has no
property order to rely on.

The existing guest SSE stream carries cart synchronization and is not reused
here.

### 14. LangChain binds the tools; the loop stays ours.

The provider is Gemini, reached through LangChain's `ChatGoogleGenerativeAI` with
`bindTools()` for the tools in decision 2. `GEMINI_API_KEY` is already present in
`apps/api/.env`; env validation follows
`docs/agent/backend/architecture.md` - Environment.

All provider access goes through LangChain; the Gemini SDK is not called
directly. LangChain's role is the provider abstraction and the tool binding -
nothing more. Adopting it is about swapping providers cheaply when comparing
versions, and about giving a future retrieval version somewhere to grow into.

Alternative considered: `createAgent` / LangGraph, so the loop machinery exists
when executing tools arrive. Rejected, and the reason is testability rather than
weight.

A framework-owned loop decides for itself when to stop and how to shape the
result, so tests have to assert on framework behavior. The current suite can
assert things like "there is never a third model call" only because the loop is
ours; hand that loop to LangGraph and that assertion becomes a statement about
LangGraph. Tests would turn integration-shaped and brittle, and the stubbing that
keeps 500-plus tests free of network and cost would get harder.

This holds even when executing tools do arrive: the loop should stay
hand-written, because everything inside it is a product decision - tool budgets,
termination, degradation, the quality signals. LangChain keeps binding the tools.

This is compatible with decision 15: the message array passed to
`ChatGoogleGenerativeAI` maps onto the provider request in order, with the
system message becoming the system instruction, so prefix ordering stays under
our control. Implicit caching needs nothing from the client beyond that stable
prefix, so wrapping the provider in LangChain does not cost us the cache.

### 15. Prompt layout is ordered by volatility, for cache hits.

Gemini implicit caching matches on a common prompt PREFIX, above a per-model
minimum token count. The documented figure for the 3.x **Flash** models is 4,096
tokens. The configured default is a **Flash-Lite** model, which the documentation
does not list separately, so 4,096 is the working assumption for it and not a
confirmed number.

The floor has a consequence worth stating whatever its exact value turns out to
be: a store whose core instructions plus menu fall under it gets no caching at
all. That is a property of how much menu the store has, not a setting anyone can
turn on — and it is why the cache-read count is recorded per turn. A few real
turns against a small store and a large one will show where the floor actually
sits, without anyone having to find it in a document.

Do not re-derive this figure, or a model name, from memory: the lineup and the
thresholds move, and both have already been wrong once in this document. Check
the provider's current documentation, and defer to whoever is running the
deployment.

That makes ordering, not role labelling, the thing that decides whether caching
works. Content is assembled most-static first:

1. System instruction: core rules only. Identical for every request served by a
   version.
2. Store menu and store information, supplied as a clearly delimited
   system-provided data block in a user-role turn. Identical for every guest of
   that store until the menu changes, so the prefix is shared ACROSS
   conversations, not just within one.
3. Conversation history or its rolling summary. Append-only, so earlier turns
   stay a stable prefix as the conversation grows.
4. The current turn: cart snapshot, previous proposal outcome, and the guest's
   message.

The cart snapshot is the most volatile input and therefore goes last. Placing it
before the history - a natural-looking choice - would invalidate the cache on
every single turn.

Volatile data must never be placed in the system instruction, which is part of
the cached prefix. This is the reason behind the "keep the system prompt fixed
and pass changing content as user input" instinct: the mechanism is prefix
stability, not any property of the user role. The delimited data block also
makes it explicit to the model which text is platform-supplied data rather than
guest instruction, which matters once store-authored rules arrive (decision 9).

Each turn records the cache-read token count that the provider reports
(`usage_metadata.cached_content_token_count`, surfaced by LangChain as
`input_token_details.cache_read`), so cache hit rate is measurable per version
rather than assumed.

v1 DOES use caching. Implicit caching is enabled by default on the current Gemini
models, is applied server-side, and needs no client configuration - the prefix
ordering above is the whole implementation. Skipping explicit caching therefore
does not mean skipping caching.

Explicit caching with a TTL is deferred: it adds cache-object lifecycle
management and storage billing, and a menu small enough to miss the per-model
floor would not benefit from it either. Cache-read token counts are recorded per
turn (see above), so the decision to revisit this can be made from measurements
rather than assumption.

### 16. Rate limits.

The endpoint is public, the caller has no account, and the provider is metered,
so limits ship with the feature rather than after it:

- 10 requests per minute per guest token. Far above human typing speed, low
  enough to bound a runaway or scripted client.
- 1 in-flight request per guest token; a second concurrent request is rejected
  rather than queued. This also removes double-submit races on the proposal
  flow.
- 50 turns per conversation, enforced at append time. Past that the endpoint
  refuses. A real ordering conversation is well under 20 turns, so this only
  catches abuse.

These are cost guards with deliberately generous headroom, not product limits;
they are expected to be tuned once real traffic exists.

Backed by Redis, which the project already requires and already runs in its
compose setup, so the limits hold across API instances instead of being
multiplied by the instance count. The counter is a fixed window (`INCR` plus one
`PEXPIRE` on first use) and the in-flight guard is a lock (`SET NX PX`, released
in a `finally`).

The lock is taken BEFORE the counter is incremented. A request refused for
concurrency must not consume rate budget, or a client firing parallel requests
would burn the whole window's allowance on requests that were never served; when
the counter then refuses, the lock just taken is released again.

The lock's expiry and the turn budget are chosen together. A turn is hard-capped
at `maxTurnDurationMs`, enforced by the service rather than by the provider
timeouts — those bound only the model calls, not the database reads, the menu
fetch, or the write around them. Because the turn always finishes, the request
that took the lock always releases it, and the expiry only ever fires after a
process died mid-turn. That is why it is set generously (three minutes against a
75-second budget): a lock expiring mid-turn would let a second request through
and defeat the concurrency guard, which costs money, while a lock left behind by
a crash costs one guest a wait.

Each provider call's own timeout is additionally clamped to whatever is left of
the turn budget, so a late call cannot start with two seconds remaining and run
for twenty.

The limiter is an injectable interface with a second, in-process implementation
that unit tests use, because a service test should not need a Redis connection.
The turn ceiling is not part of it — that is read from the conversation document,
being persisted state rather than a counter.

### 17. Proposal operations reuse the existing cart request contracts.

An operation carries the payload the cart API already accepts: `add_item` uses
the existing add-item request shape, `update_own_item` uses the existing update
shape plus the existing item id, and `remove_own_item` carries only the item id.
The AI contract derives these from the cart schemas rather than restating them.

This is the constraint that keeps decision 1 from blurring responsibility. With
it, an AI proposal is simply a second way to produce a cart request, sitting
beside the product configuration sheet - one execution path, two input methods -
and the frontend needs no domain knowledge it did not already have. Without it,
a proposal becomes an AI-specific instruction language the frontend must
interpret, which would put "what adding an item means" in two places at once.

Two further consequences. The model's output contract cannot drift from what the
cart actually accepts, because both are generated from one schema. And the day a
useful proposal cannot be expressed in the cart's own request contract is the day
this design needs revisiting - which surfaces as a type error rather than as a
silent workaround.

### 18. The model is asked for less than the API returns.

The model-facing schemas are the tools' ARGUMENT schemas, internal to the backend
and deliberately narrower than the contract in `packages/shared`. The gate
validates a tool call's arguments against them and then hydrates the result into
the API response, supplying every backend-owned field.

The mechanism changed with decision 2 - a response schema became tool arguments -
but the rule did not: the model is asked only for what it alone can decide.

Absent from what the model can supply: `confirmationRequired`, `proposalId`,
`promptId`, `operationId`, `allowFreeText`, and choice option ids.

`confirmationRequired` is the one that forces this. If the model could emit it, a
single `false` would skip a store's confirmation step — which decision 6 says
only the store setting AND the version's permission may do. Removing the field
from what the model can express is stronger than validating it afterwards: a
field the model cannot emit is a field it cannot get wrong.

The generated ids follow the same reasoning. Ids the model invents either
collide with real ones or resolve to nothing, and both are the backend's problem
to prevent rather than detect. Option ids in particular are assigned at hydration
and stored with the prompt, so a guest's later `selectedOptionId` always resolves
against something the backend issued.

The model boundary is not an app boundary, so these schemas stay out of
`packages/shared`. Adding a field is a claim that the value cannot be computed
from config, store data, cart state, or the conversation.

### 19. Tools do not execute; outcomes reach the model on the next turn.

Decision 2 binds tools but never runs them, so the model does not learn what
became of its own proposal until the guest's next message carries
`previousOutcome` (decision 5).

This is a deliberate deferral of something genuinely wanted: the model seeing the
result of its own action, so it can react when something goes wrong. Two things
already cover most of that ground - validation rejects an impossible operation
before the guest ever sees it, and `previousOutcome` reports acceptance,
dismissal and execution failure on the following turn. What is missing is only
immediacy: the assistant cannot say "added, that comes to 280, want a side?"
without the guest typing again.

Two ways forward, recorded so the choice is informed rather than rediscovered:

- **A turn carrying only an outcome.** After the guest accepts, the client sends
  another turn with `previousOutcome` and no message, and the assistant replies to
  the result. This needs no execution, no suspended state, and no reversal of any
  decision - only a contract change, since `message` is currently required. It
  buys the immediacy without the machinery.
- **Executing tools.** The backend runs the operation and feeds the result back,
  which allows multi-step self-correction inside one turn and catches conflicts
  that only appear at execution time. It reverses decision 1, removes the moment
  the guest accepts anything, and therefore needs the confirmation flow
  redesigned - either automatic application or the suspended-run machinery
  decision 1 already rejected.

Cost of evaluation is part of this choice. With tools that do not execute, an
eval case is exactly one provider call and touches no state, so a corpus can be
replayed cheaply and repeatedly. Executing tools make the call count per case
variable - a worse version costs more to evaluate, which is backwards - and each
run mutates carts, so the harness needs throwaway state or no-op tools that no
longer test the real path.

## Risks / Trade-offs

- A public endpoint with no user account calling a metered provider → the rate
  limits in decision 16, plus the prompt layout in decision 15 to keep the
  repeated menu prefix on the cached path.
- Whole-menu context grows with the menu, raising latency and cost → menu size
  is bounded per request and the turn has a timeout; passing that bound is the
  trigger for a retrieval-based version, not for patching this one.
- A repair retry doubles latency on the failure path → capped at one, and the
  repair rate is monitored as a version defect signal.
- The assistant proposes something the guest did not want → the accept step is
  the mitigation, and rejection rate is recorded. A store enabling auto-apply
  gives up this mitigation deliberately, which is why decision 6 also requires
  the version to permit it.
- Merchant staff can read guest conversations → scoped to the merchant's own
  store, and no allergen or health data is collected by this change.
- View-level behavior is verified manually, not by test. The web workspace has
  only `vitest` - no DOM environment and no component testing library - and
  every existing web test is pure logic, so assertions are pushed down to the
  page VM and command layer and the remaining visual behavior is listed as a
  manual check. Introducing a component-test environment is deliberately a
  separate change rather than a dependency of this one.
- The assistant answers confidently but wrongly → out of scope to detect here;
  `unanswered` only covers what the model knows it does not know. Human review
  labelling is listed as out of scope in the proposal.

## Migration Plan

Purely additive. No data migration, no change to existing collections, no change
to existing endpoints.

Rollout is controlled by the version selection env var. Unset, the assistant is
disabled and the storefront renders no entry point, so rollback is removing the
env var rather than reverting code. A provider key present in the environment
must never be sufficient on its own to route guest traffic to a paid provider.

## Open Questions

- Summarization trigger threshold and the summary's own length budget. Tunable
  after the first real conversations; it changes neither the contract nor the
  task breakdown.
- Whether a later store-level version override is worth adding on top of the
  global env selection. The env selection is sufficient for v1.
- Whether Gemini's structured output accepts a Zod discriminated union of the
  four response types directly, or whether the schema must be flattened to a
  single object carrying a `type` discriminator with optional branches. Either
  way the backend re-validates with its own schema, so this changes an
  implementation detail rather than the contract or the task breakdown.
