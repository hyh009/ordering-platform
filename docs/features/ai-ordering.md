# AI Ordering Assistant

> Status: implemented end to end — backend turn pipeline, guest storefront panel,
> merchant review surface, and the replay script. It has been exercised against a
> real provider. What remains unproven is visual: the web workspace has no
> component-test environment, so every UI assertion here is made against VM state
> (see **Manual Checks**).

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

## Provider And Model Are One Choice, And Not Part Of A Version

```txt
  AI_ORDERING_VERSION_ID    which prompt version serves traffic
  AI_ORDERING_PROVIDER      which provider route        \  selected together,
  AI_ORDERING_MODEL         which model                 /   recorded together
  GEMINI_API_KEY            the credential for that route
```

A provider and a model are one choice: `gemini-3.5-flash-lite` exists only behind
Google. `runtime/providers.ts` is the registry, and a provider id names a ROUTE,
not a vendor — reaching Gemini through Vertex would be a second id, because the
credential and the construction differ even though the model does not.

Neither belongs to a prompt version. **Replaying an old prompt against a newer
model is the point of versioning the prompt**, so a version that pinned its model
would make that impossible: you would have to forge a new version, and the
comparison would then carry two differences instead of one. A run is one cell of
`(prompt version x provider+model)`, and every stored turn records all three.

A provider id that names no provider leaves the assistant OFF, exactly as an
unknown version id does.

### Each Provider Translates The Tool Schemas Into Its Own Dialect

Gemini's `functionDeclarations[].parameters` is an OpenAPI 3.0 subset, not full
JSON Schema, and three of zod's renderings fall outside it:

```txt
  z.literal('add_item')   -> {"const": "add_item"}   400: Unknown name "const"
  z.string().nullable()   -> anyOf [..., type:null]  the subset has no NULL type
  z.discriminatedUnion    -> {"oneOf": [...]}        the subset documents anyOf
```

`runtime/geminiSchema.ts` rewrites all three — single-member `enum`,
`nullable: true`, `anyOf` — and `gemini.ts` binds the converted JSON Schema rather
than handing the zod schema to LangChain, whose own converter emits the `const`.

The translation sits on the PROVIDER side on purpose. Authoring the model-facing
schemas in Gemini's subset would shape a backend contract around one vendor's
parser, and the next provider would want something else. The schemas stay written
in zod; each adapter says what its own wire format needs.

These failures only appear against a real provider — every unit test stubs the
model — so `aiOrdering.geminiSchema.test.ts` asserts that no bound tool schema
emits `const` or names a null type. That guard, not the integration, is what keeps
the next literal from shipping.

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
    v1-2026-09-30.ts   <- status: 'draft' — still being shaped
    fingerprint.ts     <- hash of the prompt and the limits
    index.ts           <- registry + resolver
```

A version carries its prompt and its limits. It deliberately carries **no model
name**: version and model are separate replay axes, since the whole point is
running an older prompt against a newer model.

### Draft Versus Stable

A version is `draft` or `stable`, and the difference is whether its file may be
edited:

```txt
  draft   editable; its stored turns are development data, not a baseline
  stable  frozen; its versionId is what a replay points at, so editing it
          would silently redefine what its stored turns refer to
```

Freezing a stable version is **enforced, not remembered**. Every turn records a
`versionFingerprint` — a hash of the prompt text and the limits the model is held
to — and `aiOrdering.versions.test.ts` pins that fingerprint for every stable
version. Editing a frozen prompt fails the suite. The pin table must also name
exactly the stable versions, so promoting one without pinning it fails too.

The fingerprint is what makes a draft safe to edit at all. `versionId` says which
label served a turn; after an edit it no longer says which prompt did. The
fingerprint does, so a corpus full of `v1-2026-09-30` turns still splits into the
runs that share a prompt and the ones that do not.

Out of the hash on purpose: `versionId` (renaming is not a behavior change),
`status` (promotion must not move the pin), and the timeouts (they decide whether
a turn finishes, not what a finished turn says).

Promotion is one-way. A stable version that turns out to be wrong gets a
successor, not a demotion.

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
    turns[]  ->  message, reported outcomes,
                 versionId + versionFingerprint, provider, modelName,
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
- `runtime/model.ts` — the provider-agnostic seam: per-turn session, usage
  accounting, per-call timeout clamp
- `runtime/gemini.ts` — constructing the Gemini chat model, and nothing else
- `runtime/geminiSchema.ts` — rewriting tool argument schemas into Gemini's
  OpenAPI subset (`const`, null branches, `oneOf`)
- `versions/fingerprint.ts` — hashing a version's prompt and limits, so a draft
  stays readable across edits and a stable one cannot be edited unnoticed
- `runtime/messages.ts`, `runtime/failures.ts` — block-to-message mapping,
  provider failure mapping
- `promptResolution.ts` — prior prompt and reported outcomes

Persistence:

- `apps/api/src/services/aiOrdering.service.ts` — the API-facing use case
- `apps/api/src/routes/v1/public/guest/aiOrdering.ts` — the guest endpoint
- `apps/api/src/models/aiOrdering/model.ts`, `mongo.ts`
- `apps/api/src/repositories/aiOrdering/repository.ts`, `mongo.repository.ts`

Tests:

- `apps/api/tests/aiOrdering.*.test.ts`
- `apps/api/tests/fixtures/aiOrdering.ts` — test-only scaffolding; the frozen
  menu and cart themselves live in `evaluation/fixture.ts` because the shipped
  replay tool runs against them

Evaluation and replay:

- `evaluation/fixture.ts` — the frozen menu and cart, the one thing held still
- `evaluation/replay.ts` — replaying stored messages against a version
- `apps/api/src/scripts/aiOrderingReplayCli.ts` — `pnpm --filter api replay`

Merchant review (backend):

- `apps/api/src/services/aiOrderingReview.service.ts` — read side, deliberately
  separate from the turn service so review works with the assistant switched off
- `apps/api/src/models/aiOrdering/mapper.ts` — entity to DTO; `modelOutput`
  never crosses it
- `apps/api/src/routes/v1/merchant/stores/[storeId]/aiOrdering.ts`

Storefront (web):

- `apps/web/src/models/aiOrdering/` — DTO boundary and the operation-to-cart
  request mapper
- `apps/web/src/services/storeFrontAiOrdering.service.ts`
- `apps/web/src/features/storeFront/aiOrdering/` — store, actions, commands,
  outcome mapping
- `apps/web/src/pages/storeFront/menu/assistantPanelView.ts` — the pure half of
  the panel VM, which is what the tests can assert on
- `apps/web/src/pages/storeFront/menu/AssistantPanel.tsx`,
  `AssistantProposalCard.tsx`

Merchant review (web):

- `apps/web/src/features/merchant/aiOrdering/` — conversations and unanswered
- `apps/web/src/pages/merchant/aiOrderingConversationList/`,
  `aiOrderingConversationDetail/`, `aiOrderingUnanswered/`

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
  suite pins every AI variable blank so a developer's own configuration cannot
  leak into a test run.
- Not built: the merchant review surface, the storefront UI, and the replay
  script.

## Manual Checks

The web workspace has no component-test environment, so the assertions below are
made against VM state and have never been checked on screen. Each is a browser
check, not a gap in coverage of the logic.

Storefront panel:

- the chat panel renders each of the four response types (`message`, `choices`,
  `proposal`, `unanswered`)
- a `choices` answer offers its options AND still accepts typed input
- the proposal card shows one row per operation with its own dismiss control and
  a single apply at the bottom
- after a partial failure, each row shows its own result
- with automatic application resolved on, no confirmation controls appear
- the assistant entry point is absent entirely when `assistantEnabled` is false
- the transcript opens scrolled to the latest exchange

Merchant review:

- the conversation list, its unanswered count, and paging
- the conversation detail, including a turn whose output was repaired or had
  operations dropped
- the unanswered list, its reason filter, and the product reference on entries
  whose reason identifies one
- the automatic-application toggle on store settings saves and reloads
