# AI Ordering Assistant

> Status: the backend is implemented end to end — module, persistence, provider
> runtime, and the guest endpoint. The merchant review surface, the storefront UI,
> and the replay script are not built yet. This doc describes what exists today.

## Purpose

Lets a storefront guest order and ask about dishes in plain text. The assistant
proposes cart changes; the guest accepts, edits, or dismisses them. Manual
ordering is never replaced, and submitting an order stays a human action.

## The One Rule That Explains The Shape

**The backend never touches the cart.**

The guest already has full cart mutation power through the guest cart API, with
the same identity and the same validation. So a server-side apply path would add
machinery (stored plans, plan ids, replay guards) to guard against something the
guest is already allowed to do. Instead the backend only ever _proposes_, and the
frontend applies through the existing cart commands.

Everything below follows from that.

## One Turn, End To End

```txt
guest message
  |
  v
[ promptResolution.ts ]  resolve "answering a previous question"
  |                      resolve reported outcomes of the last proposal
  |                      (looked up in THIS guest's own conversation only)
  v
[ history.ts ]           window recent turns + carry rolling summary
  |
  v
[ context.ts ]           assemble blocks, most static first  (see below)
  |
  v
[ planner.ts ]  ------------------------------------------+
  |                                                       |
  |  1st model call                                       |
  v                                                       |
[ outputGate.ts ]        read the TOOL CALL, then parse   |
  |                      against the MODEL schema         |
  |                      (shape only, no data access)     |
  v                                                       |
[ validation.ts ]        4 checks against real menu/cart   |
  |                                                       |
  +-- all good ---------------------------------------+   |
  |                                                   |   |
  +-- something invalid --> ONE repair call ----------+---+
                                                      |
                                                      v
                                        [ modelResponse.ts ]
                                          hydrate: fill in every
                                          backend-owned field
                                                      |
                                                      v
                                              response to the guest
                                              + quality signals
                                                      |
                                                      v
                                        [ repositories/aiOrdering ]
                                          append one turn (never dropped)
```

## Context Assembly Is Ordered By Volatility

Gemini's implicit cache matches on a common **prefix**, so the order is chosen by
how often each part changes, not by how it reads.

```txt
  block             role     changes                          cached?
  ----------------  -------  -------------------------------  -------
  core_instructions system   never, within a version          yes
  store_data        user     when the store edits its menu    yes, and
                                                              SHARED across
                                                              every guest of
                                                              that store
  history           user     append-only, so it grows but     mostly
                             never rewrites earlier text
  current_turn      user     EVERY turn (cart snapshot,       no
                             outcomes, guest message)
```

The cart snapshot goes **last**. Putting it before the history — the more natural
reading order — would invalidate the cache on every single turn.

## The Model Is Asked For Less Than The API Returns

Two schemas, deliberately:

```txt
  packages/shared/contracts/aiOrdering.ts     the API contract
  modules/aiOrdering/modelResponse.ts         the model-facing schema (narrower)
```

The model never supplies `confirmationRequired`, `proposalId`, `promptId`,
`operationId`, `allowFreeText`, or choice option ids. `hydrateAiOrderingResponse`
fills them in.

`confirmationRequired` is the one that forces this: a model-supplied `false`
would skip a store's confirmation step. A field the model cannot emit is a field
it cannot get wrong — stronger than validating it afterwards.

Operation payloads are **derived from the cart's own request schemas**, not
restated, so the model contract cannot drift from what the cart accepts. A
contract test asserts reference equality to catch exactly that.

## Validation: Four Checks, Then At Most One Repair

`validation.ts` checks each proposed operation against data already loaded for
the context:

1. the product exists on this store's menu
2. it is not sold out
3. option selections satisfy the product's modifier rules (required choices
   present, within min/max, no sold-out option)
4. an update or remove targets an item **this guest added**

Why validate before the guest sees anything: in a confirm-then-accept flow the
accept button is a promise. An accept that fails is the worst outcome in the
interaction.

Degradation ladder in `planner.ts`:

```txt
  some operations invalid  ->  drop them, keep the rest
  all operations invalid   ->  return the model's own reply as a plain message
                               (its wording already matches the guest's language)
  nothing parsed, twice    ->  unusable; the caller surfaces an error
```

**At most two model calls, never a loop.** A model that still gets it wrong after
being told precisely what was wrong has a version defect, not a transient
failure. This is not agent tool calling: no result is ever fed back for the model
to continue reasoning from.

## Shared Cart: Read Everything, Change Only Your Own

The cart context is split into two labelled lists rather than one list plus a
rule the model has to remember:

```txt
  ### Items you may change (added by this guest)
  ### Items you may NOT change (added by other people)
```

The prompt is guidance; `validation.ts` check 4 is the guarantee. Ownership
violations are counted as a version quality signal.

## Versioning

```txt
  modules/aiOrdering/versions/
    v1-2026-09-30.ts   <- frozen once released, never edited
    index.ts           <- registry + resolver
```

A version carries its prompt and its limits. It deliberately carries **no model
name**: version and model are separate replay axes, since the whole point is
running an older prompt against a newer model.

`resolveAiOrderingVersion` returns `null` for both an unset and an unknown
version id. `null` means the assistant is off — a misconfigured id never throws
and never silently serves some other version's prompt.

`permitsAutomaticApplication` starts `false` on a new version, so every store
falls back to confirming until that version has been validated.

## Confirmation Mode: Two Axes, ANDed

```txt
  version.permitsAutomaticApplication   AND   store.assistant.autoApplyCartOperations
                                |
                                v
                     confirmationRequired  (resolved server-side)
```

Stability belongs to the version, preference belongs to the store. A version
experiment can never weaken a store's confirmation step; a store that wants
confirmation always gets it.

## Data

One conversation per `(storeId, cartId, participantId)` — in a shared cart each
participant has their own private conversation.

```txt
  AiOrderingConversationEntity
    id, organizationId, storeId, cartId, participantId
    summary?, summarizedUpToTurnIndex?
    turns[]  ->  message, reported outcomes, versionId, modelName,
                 modelOutput (raw, kept even when rejected),
                 response (what the guest saw),
                 prompt? / proposal? snapshots,
                 quality signals
```

- **Every turn is stored**, including turns whose model output failed validation.
  Rejected output is the most valuable row in the evaluation corpus.
- **No TTL index.** Carts self-delete; conversations must outlive them, because
  retention for review and evaluation is the point of the collection.
- **Turn ceiling of 50**, enforced atomically inside the update filter. It
  refuses new turns rather than evicting old ones.
- Two separate caps that must not be unified: `maxHistoryTurns` bounds what is
  **sent** to the model; `AI_ORDERING_MAX_TURNS_PER_CONVERSATION` bounds what is
  **stored**.

Indexes: unique `{id}`, unique `{storeId, cartId, participantId}`,
and `{storeId, createdAt: -1}` for the merchant review listing.

## Code Map

Contracts:

- `packages/shared/src/contracts/aiOrdering.ts`

Backend module (`apps/api/src/modules/aiOrdering/`):

- `types.ts` — version config and context types
- `versions/` — the released version registry
- `prompts/coreInstructions.ts` — the versioned system prompt
- `context.ts` — block assembly, cart ownership split
- `modelResponse.ts` — model-facing schema and hydration
- `tools.ts` — the three bound tools, and reading a tool call as an answer
- `outputGate.ts` — shape-only gate over untrusted output
- `validation.ts` — the four data checks
- `planner.ts` — the turn pipeline and the single repair
- `confirmation.ts` — version AND store resolution
- `history.ts` — window and summarisation planning
- `summary.ts` — rebuilds the rolling summary from the original turns
- `rateLimit.ts` — the limiter interface, plus an in-process implementation used
  by unit tests
- `rateLimit.redis.ts` — the implementation the service actually uses
- `runtime/` — LangChain and Gemini wiring, usage accounting, failure mapping
- `promptResolution.ts` — prior prompt and reported outcomes

Persistence:

- `apps/api/src/services/aiOrdering.service.ts` — the API-facing use case
- `apps/api/src/routes/v1/public/guest/aiOrdering.ts` — the guest endpoint
- `apps/api/src/models/aiOrdering/model.ts`, `mongo.ts`
- `apps/api/src/repositories/aiOrdering/repository.ts`, `mongo.repository.ts`

Tests:

- `apps/api/tests/aiOrdering.*.test.ts`
- `apps/api/tests/fixtures/aiOrdering.ts` — the frozen menu and cart, also the
  baseline for version replay

## Notes

Known follow-ups, tracked in `openspec/changes/add-ai-ordering-assistant`:

- Request limiting is backed by Redis, so the limits hold across API instances
  and survive a restart. The in-process implementation remains for unit tests,
  which must not require a Redis connection. The window is fixed, not sliding, so
  a burst can straddle a boundary — acceptable for a cost guard.
- A turn is hard-capped at `maxTurnDurationMs` by the service, and each provider
  call is clamped to what is left of that budget. The in-flight lock's expiry is
  set well above it (three minutes against 75 seconds), because the cap
  guarantees the lock is released explicitly — so the expiry only matters after a
  process dies mid-turn.
- A turn whose model output was unusable twice is **not stored**: there is no
  response the guest saw, and `turns[].response` is required. The raw output is
  logged instead, which means the worst failures are absent from the evaluation
  corpus. Fixing that means making `response` optional and adding a failure
  field.
- The summary rebuild is awaited inside the request, so the turn that triggers it
  pays one extra model call — roughly one turn in `summarizeAfterAgedOutTurns`
  once a conversation is past the window. Move it off the request path only if
  that latency shows up in practice.
- Blank env values count as unset (`GEMINI_API_KEY=` means no key), and the test
  suite pins all three AI variables blank so a developer's own configuration
  cannot leak into a test run.
- Not built: the merchant review surface, the storefront UI, and the replay
  script.
