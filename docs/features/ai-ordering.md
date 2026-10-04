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

**Nothing changes the cart until the guest accepts it, and then the BACKEND is
what changes it.**

A turn only ever proposes. The run pauses on the proposal and is resumed by the
guest's decision, which is when the operations execute — through the same guest
cart service the cart routes use, under the guest's own identity.

This replaces an earlier rule ("the backend never touches the cart"), and the
reason it changed is worth keeping. Client-side applying meant an outcome was
recorded only when the guest happened to send another message. A guest who
accepted a proposal and then stopped talking left a stored conversation ending in
a bare proposal, indistinguishable from one nobody acted on — so a reloaded panel
told them to ask again for items already in their cart, and the assistant could
not reason about a failure until they spoke. Executing where the outcome is known
is what closes that.

Everything below follows from that.

## One Turn, End To End

```txt
guest message
  |
  v
[ promptResolution.ts ]  resolve "answering a previous question"
  |                      read the last proposal's RECORDED outcome
  |                      (looked up in THIS guest's own conversation only)
  v
[ history.ts ]           window recent turns + carry rolling summary
  |
  v
[ context.ts ]           assemble blocks, most static first  (see below)
  |
  v
[ runtime/agent.ts ]  ------------------------------------+
  |  createAgent + planning middleware                    |
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
  +-- something invalid --> repair, up to 3 calls ----+---+
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

A `proposal` pauses the run there, checkpointed under the proposal id. The guest's
decision resumes it:

```txt
guest accepts, naming the operation ids they kept
  |
  v
[ aiOrdering.service ]   claim the decision ATOMICALLY (single use)
  |                      rebuild the tool arguments from the STORED proposal
  v
[ runtime/agent.ts ]     resume -> the proposal tool executes
  |
  v
[ cartExecution.ts ]     run each kept operation in the proposed order
  |                      never roll back; a result for EVERY operation
  v
[ guestOrdering.service ]  the same cart path the guest's own edits take
  |
  v
  one more model call, with NO tools bound
  |                      -> the assistant answers what actually happened
  v
  results + resulting cart + reply, and the outcome written
  onto the turn that proposed it
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
`operationId`, `allowFreeText`, choice option ids, or the per-operation label.
`hydrateAiOrderingResponse` fills them in.

`confirmationRequired` is the one that forces this: a model-supplied `false`
would skip a store's confirmation step. A field the model cannot emit is a field
it cannot get wrong — stronger than validating it afterwards.

Operation payloads are **derived from the cart's own request schemas**, not
restated, so the model contract cannot drift from what the cart accepts. A
contract test asserts reference equality to catch exactly that.

### The Label Is Ours, Because The Model Used It To Speak Instead Of Act

The one line beside each proposed operation used to be model-authored prose. It
was the only field the model could fill that nothing reconciled against the
fields that execute — and it eventually did what such a field invites. An
assistant announced a spicy note on an item while proposing `{ quantity: 1 }` on
an item already at one. The guest accepted, the row read "Added", and no note
existed. Every layer behaved correctly; the contract offered a place to describe
an action instead of specifying one.

`operationLabel.ts` now derives the line from the operation, the menu and the
cart, so it cannot say more than the operation does. An update names only what
changes — listing the untouched parts would make the label describe the item
rather than the operation, which is the same gap again.

The label is still delivered on the wire, so the panel, the merchant review
surface, the stored corpus and the replay report are unchanged. Only its author
moved.

The product name is taken in the **store's default locale** while the reply
follows the guest's language, so a guest writing in another language reads a
reply in theirs above a label in the store's. Accepted deliberately: a label that
is honest in the wrong language beats one that is fluent and false. The web
client holds the menu, the cart and i18n, so it can compose its own later.

### Every Model-Facing Field Says What It Is For

The schema the provider receives carried no field documentation at all —
`description` appeared zero times. The model was handed `summary` (string, 240)
and `item.notes` (string, 500, nullable) with nothing to distinguish them, and
nothing at all to distinguish `notes: null` ("clear it") from omitting `notes`
("leave it alone"), which are opposites.

Every field is now described, and a test walks the generated JSON Schema and
fails on any property without a description — a new field must be documented
rather than merely added.

The descriptions sit on the model-facing composition, never on the shared cart
request schemas. Those are what the guest cart routes validate against; prose
written to steer a language model would be read there by the wrong audience. A
test asserts the shared contract stays free of them.

## The Model Reads And Writes Short Codes, Not Ids

Every product, modifier, option and cart item id is a prefix plus a UUID, and the
model has to copy each one from the menu into an operation without changing a
character. In the prompt each is written as the first eight hex digits of its
UUID:

```txt
- 1a2b3c4d | 珍珠奶茶 | 60 | choices: aaaa1111
```

`shortCodes.ts` turns the codes in an answer back into ids straight after the
output gate. Validation, hydration, the labels, the cart and the stored proposal
all work on real ids; nothing past the gate knows codes exist. Validation's
messages are rewritten the other way before they become a repair note, since the
model only ever saw codes.

**Derived from the id, never numbered.** A numbered code means something else
whenever the menu is reordered or an item is added, so a code the model carried
over would silently name a different product. A derived code points at the same
id or at nothing, and "nothing" is what validation already rejects.

Two ids sharing their first eight digits both keep their full id, decided per
turn from the menu and cart shown that turn. An id with no UUID in it is left
alone, and a full id in an answer is still accepted.

The stored `modelOutput` keeps what the model actually wrote, so merchant review
shows codes there and ids everywhere else.

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

## Validation: Five Checks, Then A Bounded Repair

`validation.ts` checks each proposed operation against data already loaded for
the context:

1. the product exists on this store's menu
2. it is not sold out
3. option selections satisfy the product's modifier rules (required choices
   present, within min/max, no sold-out option)
4. an update or remove targets an item **this guest added**
5. the operation **changes something**

The fifth exists because the first four all pass for an update that restates the
item's current values. That operation is valid in every data sense and
completely pointless, and without this check it reaches the guest as an action
and reports success.

An absent field means "leave this alone", so only the fields the model supplied
are compared. Options compare as an unordered set — order carries no meaning in
a selection — and `notes: null` against an item with no note is a request to
clear nothing. A redundant field alongside a real change still passes: the check
fires only when every supplied field already matches.

Why validate before the guest sees anything: in a confirm-then-accept flow the
accept button is a promise. An accept that fails is the worst outcome in the
interaction.

Degradation ladder, in the planning middleware:

```txt
  call 1, may propose      ->  clean: use it
  call 2, may propose      ->  told what was wrong with call 1
                               clean: use it
                               some operations valid: drop the rest, keep those
  call 3, may NOT propose  ->  told nothing could be applied, and why
                               the model explains to the guest, or asks
  call 3 failed too        ->  a FIXED line as a plain message
  nothing ever parsed      ->  unusable; the caller surfaces an error
```

**At most three model calls, and the third cannot propose.** The proposal tool is
unbound on the last call rather than forbidden in prose. A change that fails for
a reason the model cannot fix — a sold-out product, an item that is gone — fails
the same way however many times it is retried, so the last call is spent on
telling the guest what happened instead of on a third attempt. Written knowing
nothing was proposed, that reply is in the guest's language and names the actual
reason.

The fixed line is the last resort: the third call failed, ran out of the turn's
budget, or came back unusable. Its language is read from what the guest typed —
any Han character reads as Chinese, any Latin letter as English — and falls back
to the store's default locale when the message names neither. It follows the
guest, unlike an operation label, because it is spoken to them and is the only
thing they read that turn.

What is never shown is the reply the model wrote alongside the failed proposal.
It was written to introduce a list — "請確認以下變更：" — and the list is gone,
so the guest read an offer with nothing under it. It then sat in the history,
where the model took it as its own word that the change was made. What the model
wrote is still stored as `modelOutput` for review.

This is not agent tool calling: no tool result is ever fed back for the model to
continue reasoning from. The repair notes are appended after the prompt, in
order, so each call keeps the prefix the one before it cached.

Transient provider failures are a separate matter and are not counted here. The
chat model retries 429s, 5xx responses and network errors on its own, with
exponential backoff, inside the per-call timeout.

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
    fingerprint.ts     <- hash of the prompt, the limits, and the answer shape
    index.ts           <- registry + resolver
```

A version carries its prompt and its limits. It deliberately carries **no model
name**: version and model are separate replay axes, since the whole point is
running an older prompt against a newer model.

The fingerprint covers the **answer shape** as well as the instructions. The
shape the model must answer in is half the contract, and hashing only the prompt
left changes to it invisible: two runs answering in different shapes compared as
though they were the same version. The shape is hashed BEFORE any provider
rewrite, so a Gemini dialect fix does not read as a version change and one
version served through two providers shares a fingerprint — which is what keeps
the provider axis separate from the version axis.

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

## The Transcript Belongs To The Server, Not The Panel

The panel's transcript is in-memory zustand state in a module-level singleton, so
it survives collapsing the panel and navigating between storefront pages. It does
not survive a reload — and the conversation does, because the assistant reads all
of it on every turn. Without a read endpoint that left the worst possible state:
a blank panel beside an assistant answering as though mid-conversation.

```txt
  GET /v1/public/guest/ai-ordering/conversation
    requireGuest only — no requireOpenStore, no runtime, no rate limiter
    scoped by (storeId, cartId, participantId) from the token
```

Three things the read deliberately does not do, all for the same reason — reading
back what you already said is not a turn:

- **no runtime resolution**, so the transcript survives the assistant being
  switched off or losing its credentials;
- **no rate limiter**, so reopening the panel cannot spend the budget for
  actually talking;
- **no open-store requirement**, so a guest can read back what they discussed
  after the store closed.

`AiOrderingGuestTurnDto` is a separate narrowing from `AiOrderingReviewTurnDto`
over the same stored turn, not a subset of it. The fingerprint, provider, model
name, and quality signals exist to tell a merchant why a version needs work; a
storefront response must not carry them.

The panel reads on first open, not with the menu: a guest who never opens it
should not pay for the request. `loadConversation` is idempotent per conversation,
so the panel asks on every open and only the first call reaches the network.

### A Restored Proposal Carries Its Real Outcome

The server records a proposal's outcome when it executes it, so a reloaded
transcript can say what actually happened:

| state     | when                             | drawn as                              |
| --------- | -------------------------------- | ------------------------------------- |
| `live`    | not decided, and not yet expired | the full card, with apply and dismiss |
| `history` | decided                          | its rows, with each one's real result |

Two states, not three. A lapsed proposal is a decided one whose operations are
all `superseded`, so `pending` means exactly one thing to the panel: there is
still something to accept.

**This is the defect the change exists to fix.** Before it, outcomes travelled on
the guest's next message, so a proposal that was the last stored turn was
indistinguishable from one already applied. The panel had to hedge — "this
suggestion is from before, ask again if you still want it" — and that line was
wrong exactly when it mattered, shown to a guest whose items were already in
their cart. A pending proposal also could not be restored as answerable, because
restoring Apply on an already-applied one would have doubled the cart.

## The Cart Sits Beside The Conversation

The assistant used to be a full-screen modal over the menu page, which covered
the menu's own cart bar, so the guest could not see the cart change while the
assistant was changing it — and the proposal card ended by telling them to go and
check the cart. Verifying the result cost three navigations, at exactly the moment
a guest is deciding whether to trust the assistant.

```txt
  >= md    conversation | cart          two columns, both always rendered
  <  md    conversation, cart over it   a control reveals it, dismissing returns
```

The surface is full-bleed at every width, `h-dvh` and never `h-screen` — iOS
Safari's `100vh` excludes the address bar, which would push the composer under the
browser chrome. On a wide viewport the background is full-bleed but the content is
capped and centred, because an unconstrained conversation runs to an unreadable
line length and pushes the cart column to the far edge, undoing the one thing this
layout exists for.

The height is fixed rather than a maximum. It used to be `max-h-[85vh]` inside a
vertically centred container: the box grew with its content, and a centred box
that grows puts that growth at both edges, so the header and the composer moved on
every new message. A fixed frame with the transcript flexing inside it is what
stops that.

The layout is chosen in CSS (`hidden md:flex` for the column, `md:hidden` for the
overlay), not by a breakpoint listener. So the narrow-viewport visibility toggle
is component-local presentational state that nothing has to synchronise: at `md`
and up the column is always rendered and the toggle is simply unread.

The cart rendered here is the cart, not a restatement of it. `AssistantCartPanel`
reuses `ParticipantOrderSection` and `OrderTotals` — the cart page's own
components — so prices, options and totals are the values the cart reports rather
than the model's per-row summaries. Edit handlers are passed only for the guest's
own section, which is how `ParticipantOrderSection` already expresses read-only,
so a shared cart has the same limits here as everywhere else.

`groupCartItemsByParticipant` lives in `models/cart` because `isCurrentUser`
answers "may this session edit these items". Two surfaces render the cart, and two
copies of that derivation would mean two answers to that question — in the one
place where a wrong answer lets a guest change someone else's order.

Submitting is reachable from here too. It reuses the cart page's confirmation,
command and navigation, so there is one submission flow. This does not widen what
the assistant can do: "Order submission stays human-only" constrains the
assistant's operation set, not where the guest's own submit action is rendered.

### Accepting Blocks The Surface, And The Guard Is Below The UI

An overlay covers the panel while a decision is in flight, and clears when the
response returns. No extra wait is needed: the response carries the cart the
server produced, so the surface unblocks on a confirmed cart rather than on a
second read.

`isApplying` is separate from `isSending` because the transcript auto-scroll
reacts to `isSending`, and accepting must not scroll the transcript.

The flag is also the client-side guard: `applyProposal` returns early when it is
already set. The backend refuses a second decision too, but a client that sent
one would show the guest a conflict error for pressing a live button. A disabled
button is a UI promise; the guard is the invariant, and the backend's claim is
the guarantee.

The overlay sits inside the panel's own relative box rather than a new fixed
layer, so no z token was added and the feedback modal and toast layers stay above
it — a toast from a failed decision has to be readable.

## When An Operation Fails, The Scope Decides What Happens Next

Execution is one cart call per kept operation, in the proposal's order, inside
`modules/aiOrdering/cartExecution.ts`. A failure is classified as either scope:

| scope     | codes                                                                                                                         | the loop  | the guest                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------ |
| `item`    | `PRODUCT_SOLD_OUT`, `PRODUCT_NOT_FOUND`, `CART_ITEM_NOT_FOUND`, `MODIFIER_SELECTION_INVALID`, `NOT_ITEM_OWNER`, `BAD_REQUEST` | continues | that row gets a reason; the others still execute |
| `session` | `CART_NOT_ACTIVE`, `CART_NOT_FOUND`, `ORDER_LOCKED`, `STORE_NOT_OPEN`, `INVALID_GUEST_TOKEN`, and anything unmapped           | stops     | the rest are reported as not attempted           |

The question each code answers is **does this say anything about the operations
after it**. A sold-out product says nothing about the next one, so stopping would
abandon changes that would have worked. A locked cart says everything about them,
so continuing only produces N copies of one error. An unmapped code is treated as
session-scoped: stopping early costs the guest one extra round trip, carrying on
through an unknown failure costs N identical errors.

**A concurrent cart write is retried before it counts as a failure.** The cart
layer already retries a lost optimistic write three times with no pause and only
then reports `CONFLICT`. In a shared cart that means several people wrote in the
same instant, which passes on its own, so the operation is tried twice more after
a short wait (100 ms, then 250 ms). It is safe to repeat: on these paths
`CONFLICT` is raised only when the write did not apply, and each try re-reads the
cart and validates against it again. Only when those run out does it become a
`failed` row with a session-scoped stop. No other code is retried — a sold-out
product fails the same way every time.

**Nothing is rolled back.** A guest who watched two items land should not see them
vanish because a third failed. The response reports all three.

**Every operation carries a result**, including the ones the guest dismissed and
the ones a session-scoped failure left unattempted. An operation with no result
would be an outcome the assistant has to infer from absence, and "the guest said
no" and "we never tried" are not the same thing to say back.

The reason then reaches the guest. `assistantPanelView.ts` maps the code to a
presentation kind — several codes collapse where the guest's situation is the
same — and an unrecognised code falls back to a generic line rather than
vanishing.

**There is no per-row retry.** Retrying one row used to mean a second cart call
outside the proposal, which a single-use proposal does not allow. The guest asks
the assistant instead, which is also how they get an alternative that is valid
now rather than the same failure again.

### A Proposal Is Single Use

A proposal can be decided once. The guarantee is a conditional write: the
decision is recorded only if no decision is recorded yet, so two acceptances in
flight at once resolve to exactly one execution and the loser is refused as
already decided.

Claiming and reporting are two writes because they answer two questions at two
moments. The claim settles WHO decides, before anything runs. The results settle
WHAT happened, after. One write would mean either executing before the claim —
which lets both apply — or holding the claim open across the cart calls.

"Already decided" and "expired" stay distinct codes. Telling a guest who
double-submitted that their proposal expired is a different lie from telling a
guest who waited that they already acted.

### A Proposal Belongs To The Turn That Made It

Sending another message settles the previous proposal. Its decision is written
with every operation `superseded`, which means it can no longer be applied — the same conditional write that refuses a second acceptance
refuses this one.

Without it, an unanswered proposal stayed applicable for as long as its
checkpoint lived. A guest could talk for ten turns and then accept an offer made
against a cart and a menu that had both moved on.

It is settled at the START of the next turn, not when that turn is stored. The
model needs the outcome in the context of the turn where the guest typed instead
of accepting:

> **Guest:** 我要去冰
> **History:** You (proposal): 好的，為您加上無糖鮮奶茶
> **Cart:** _(no milk tea)_

Before this, nothing reconciled those two. "You never answered" and "I never
offered" looked identical to the model, while its own reply sat in the history
saying the item was added — so it believed itself over the cart and invented a
cart item id for an item that was never there. Every operation then failed
ownership validation, the proposal degraded to a bare reply, and the guest read
"請確認以下變更：" with nothing under it.

So the outcome block now leads with which source wins:

> This is what the cart actually did. Where it disagrees with what you said last
> turn, this is right and your reply was not.

Each outcome line names what was proposed, not only its operation id:

```txt
- op-1 | add_item | product prod-milk-tea | x1: the guest never answered it …
```

The history holds only the reply, so without this the model knows that `op-1`
lapsed but not what `op-1` was, and cannot offer the same change again. Ids
rather than names, because re-proposing means sending those ids and the menu
block already names them.

This covers the most recent proposal only, and it lives in `current_turn`, not
on the history turn that made the proposal. Marking one history turn as "the
latest" would rewrite earlier text whenever a newer proposal appeared, and the
history block is append-only so its prefix stays cacheable.

The write reuses the acceptance's own conditional claim, so a guest who presses
accept in the same instant they send a message cannot get both: exactly one
write matches `decision: { $exists: false }`, and if the acceptance wins, its
results are what the model is told.

The turn response carries `settledProposal` when this write won. The panel has
no other way to learn it: nothing happened on the client, the guest simply
typed. It is reported only on a won claim — if an acceptance landed in the same
instant, that client already has the real results, and sending the no-action set
would overwrite them with the write that lost.

That outcome is written onto the TRANSCRIPT ENTRY that proposed it, matched by
proposal id. The live card and the transcript are two renderings of one
proposal, and only the card used to be updated — so a guest reading back saw
every past proposal with no verdict, an applied one and an abandoned one looking
identical. Matching by id rather than position matters because a result can
settle an entry several turns back.

`superseded` is an outcome of its own, not a reuse of `no_action`. There are now
four ways an operation does not reach the cart and none of them are collapsed:

| outcome      | what happened                                                 |
| ------------ | ------------------------------------------------------------- |
| `rejected`   | the guest unchecked the row before accepting                  |
| `superseded` | the guest never answered; the next message ended the proposal |
| `no_action`  | accepted, but an earlier failure stopped the proposal first   |
| `failed`     | accepted and attempted, and it would not apply                |

The guest reads 已移除 / 你沒有回應 / 未嘗試 / 無法套用. Showing "未嘗試" for a
proposal the guest simply walked past described the system rather than what they
did, which is what prompted splitting the value out.

The proposal-level `decision.superseded` flag is kept as well, because an empty
proposal has no operations to carry an outcome: it is what lets the decide path
report a lapsed proposal as expired rather than as already answered. "You
already answered this" and "that offer lapsed, ask again" are different things
to tell a guest.

### The Paused Run Lives In Its Own Store

Human-in-the-loop interrupts need a checkpointer, so a paused run is written to
`aiOrderingCheckpoints` with a 24-hour TTL. Two stores, deliberately:

- the conversation collection is the long-lived record — merchant review, the
  evaluation corpus, the transcript a guest reloads. No TTL.
- the checkpoint collection is execution state, read only by the resume path.
  Dropping it would expire pending proposals and lose nothing else.

The TTL is the proposal's lifetime, not a storage detail: a guest who walks away
should not return the next day and apply a proposal built from a menu and a cart
that have both moved on.

It gets its own MongoDB client rather than borrowing Mongoose's, because the
saver depends on the v6 driver and Mongoose 9 ships v7. A second pool to the same
database is the cheaper risk than passing a client across a driver major on a type
assertion, and it is opened only when the assistant is enabled.

## Data

One conversation per `(storeId, cartId, participantId)` — in a shared cart each
participant has their own private conversation.

```txt
  AiOrderingConversationEntity
    id, organizationId, storeId, cartId, participantId
    summary?, summarizedUpToTurnIndex?
    turns[]  ->  message,
                 versionId + versionFingerprint, provider, modelName,
                 modelOutput (raw, kept even when rejected),
                 response (what the guest saw),
                 prompt? snapshot,
                 proposal? snapshot -> operations + decision?
                                       (decidedAt + a result per operation,
                                        superseded? when never answered)
                 quality signals
```

A proposal snapshot carries its own decision. That is deliberate: the outcome
belongs to the turn that PROPOSED it, not to whichever later turn happened to
mention it, which is how it used to be stored and why it could go unrecorded
entirely.

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

### The Review Surface Shows What The Model Answered

The quality signals say THAT a turn was degraded. They do not say what the model
said, and that is the question every real investigation turned out to be: _the
reply promised a note and no note was written — did the model fail to put it in
the operation, or did the operation fail to apply?_ The reply alone cannot tell
them apart, and for a while the only way to find out was to read the stored
document by hand.

So the merchant review DTO carries `modelOutput`: the tool the model called, the
arguments it called it with, and any text beside them. Three boundaries keep
that from becoming a hole:

- **The merchant only.** `AiOrderingGuestTurnDto` carries no equivalent. This is
  what the assistant TRIED to do, which is not the same as what the guest was
  told, and the guest surface must never conflate them.
- **A declared projection, not the raw reply.** `turns[].modelOutput` is
  `unknown` on the entity and `Mixed` in Mongo, so `toAiOrderingModelOutputDto`
  asserts the shape in one place and drops a value that does not fit. A reviewer
  reading a half-recognized object would be reading the runtime's internals,
  which is exactly what withholding the field was meant to prevent. Dropping it
  reads as "nothing recorded", and the full value is still in the database.
- **`args` stays untyped.** Every tool has its own argument shape, the reviewer
  renders it as JSON, and the interesting case is precisely the arguments that
  FAILED validation — so re-validating them at this boundary would hide the one
  thing worth looking at.

A turn with no usable output at all is never stored (there was no response the
guest saw), so it shows up in the API log rather than here. That is still the one
gap: an unusable turn is the hardest to diagnose and the least visible.

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
- `cartExecution.ts` — running an accepted proposal's operations, and the
  item/session failure scope
- `shortCodes.ts` — the short codes the model reads and writes in place of ids
- `operationLabel.ts` — the per-operation label, derived from the operation
- `confirmation.ts` — version AND store resolution
- `history.ts` — window and summarisation planning
- `summary.ts` — rebuilds the rolling summary from the original turns
- `rateLimit.ts` — the limiter interface, plus an in-process implementation used
  by unit tests
- `rateLimit.redis.ts` — the implementation the service actually uses
- `runtime/agent.ts` — the agent run: `createAgent`, the human-in-the-loop
  interrupt, and the planning middleware that owns the gate, validation, the
  bounded repair attempts, and the quality signals
- `runtime/checkpointer.ts` — the paused-run store and its TTL
- `runtime/model.ts` — the provider-agnostic seam: usage reading and the
  per-call timeout clamp
- `runtime/gemini.ts` — constructing the Gemini chat model, and nothing else
- `runtime/geminiSchema.ts` — rewriting tool argument schemas into Gemini's
  OpenAPI subset (`const`, null branches, `oneOf`)
- `versions/fingerprint.ts` — hashing a version's prompt and limits, so a draft
  stays readable across edits and a stable one cannot be edited unnoticed
- `runtime/failures.ts` — provider failure mapping
- `promptResolution.ts` — the prior prompt, and reading the last proposal's
  recorded outcome

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
- `evaluation/replay.ts` — replaying stored messages against a version. It drives
  the SAME agent production drives, with an in-memory checkpointer and a resume
  that never comes, so it stays read-only by construction: a proposal pauses the
  run, which makes the executing tool unreachable
- `apps/api/src/scripts/aiOrderingReplayCli.ts` — `pnpm --filter api replay`

Merchant review (backend):

- `apps/api/src/services/aiOrderingReview.service.ts` — read side, deliberately
  separate from the turn service so review works with the assistant switched off
- `apps/api/src/models/aiOrdering/mapper.ts` — entity to DTO; `modelOutput`
  crosses it only as a declared projection (tool name, arguments, text), and
  only to the merchant
- `apps/api/src/routes/v1/merchant/stores/[storeId]/aiOrdering.ts`

Storefront (web):

- `apps/web/src/models/aiOrdering/` — the DTO boundary
- `apps/web/src/services/storeFrontAiOrdering.service.ts`
- `apps/web/src/features/storeFront/aiOrdering/` — store, actions, commands. One
  call per decision; there is no client-side apply loop, failure classification,
  or outcome bookkeeping left here
- `apps/web/src/pages/storeFront/menu/assistantPanelView.ts` — the pure half of
  the panel VM, which is what the tests can assert on
- `apps/web/src/pages/storeFront/menu/AssistantPanel.tsx`,
  `AssistantProposalCard.tsx`, `AssistantProposalRecord.tsx`,
  `AssistantCartPanel.tsx`

Merchant review (web):

- `apps/web/src/features/merchant/aiOrdering/` — conversations and unanswered
- `apps/web/src/pages/merchant/aiOrderingConversationList/`,
  `aiOrderingConversationDetail/`, `aiOrderingUnanswered/`

## Notes

Known follow-ups, tracked in `openspec/changes/archive/2026-10-04-add-ai-ordering-assistant`:

- Request limiting is backed by Redis, so the limits hold across API instances
  and survive a restart. The in-process implementation remains for unit tests,
  which must not require a Redis connection. The window is fixed, not sliding, so
  a burst can straddle a boundary — acceptable for a cost guard.
- A turn is hard-capped at `maxTurnDurationMs` by the service, and each provider
  call is clamped to what is left of that budget. The in-flight lock's expiry is
  set well above it (three minutes against 75 seconds), because the cap
  guarantees the lock is released explicitly — so the expiry only matters after a
  process dies mid-turn.
- A turn whose model output was unusable on every attempt is **not stored**: there is no
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
- `HumanInTheLoopMiddlewareConfig` resolves to `never` under the installed
  LangChain versions, because that package's `zod/v3` types and
  `@langchain/core`'s do not unify. The config is cast at one call site in
  `runtime/agent.ts`; the runtime shape is pinned by the interrupt tests rather
  than by the type.
- `CartDto.notes` is still a dead field.

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
- a failed row shows a reason in the guest's terms, and no retry control — a
  single-use proposal has none
- after a session-scoped failure, the rows that were never attempted read as
  "not attempted" rather than as refusals
- a decided proposal offers no apply, not even for a row that failed
- with automatic application resolved on, no confirmation controls appear
- the assistant entry point is absent entirely when `assistantEnabled` is false
- the transcript opens scrolled to the latest exchange
- the header and the composer do not move as messages arrive, at either width
- on iOS Safari the composer stays above the address bar
- the panel shows a spinner on first open, and the empty-state hint only after
  the read confirms there is nothing stored
- after accepting a proposal and reloading, it comes back showing what actually
  happened per operation, with no line telling the guest to ask again
- after reloading with a proposal still undecided, it comes back answerable, and
  accepting it then changes the cart exactly once
- a proposal left unanswered past its lifetime refuses with an expiry message
  distinct from "already answered", and changes nothing
- double-submitting a decision changes the cart once; the second attempt reports
  that the proposal was already answered
- a restored transcript ending on a `choices` question still answers that question
- at `md` and up the cart is visible beside the conversation and updates as a
  proposal is applied
- below `md` the cart control opens the cart and dismissing it returns to the same
  conversation, with the transcript and any open proposal intact
- another participant's section in a shared cart shows their items with no edit
  controls
- changing a quantity or removing an item from inside the assistant works, and the
  transcript does not scroll when it does
- accepting shows the overlay and clears it once the response returns, including
  after a failure
- after a failure, the assistant's own reply in the same exchange speaks to what
  failed rather than waiting for the guest to ask
- submitting from the assistant asks for confirmation, and declining changes
  nothing
- editing away an item that a still-open proposal references makes that row fail
  with a reason rather than silently doing nothing
- asking the assistant to add a note to an item already in the cart, accepting,
  and seeing the note on that item — the case this contract tightening came from
- a proposal that promises a note it did not specify never reaches the guest: the
  assistant is made to correct itself instead
- the per-operation label describes the change rather than the item, so an update
  to one field does not read as a restatement of the whole item

Merchant review:

- the conversation list, its unanswered count, and paging
- the conversation detail, including a turn whose output was repaired or had
  operations dropped
- the unanswered list, its reason filter, and the product reference on entries
  whose reason identifies one
- the automatic-application toggle on store settings saves and reloads
