## Context

See `proposal.md` — Why. The defect and its evidence are not restated here.

What matters for the approach: the assistant's contract with the model has two
halves that are maintained in different places and defended unevenly.

- The **instructions** are prose in `prompts/coreInstructions.ts`, versioned, and
  covered by the fingerprint.
- The **answer shape** is `aiOrderingModelArgumentSchemas` in `modelResponse.ts`,
  bound as tools via `tools.ts`, rewritten per provider in
  `runtime/geminiSchema.ts`. It is versioned by nothing.

The shape half currently carries no field documentation at all. Confirmed by
reading what the provider receives: `description` appears zero times.

Two existing decisions this design keeps, because they are load-bearing:

- The operation's `item` reuses the cart's own request schemas
  (`cartItemInputSchema`, `updateCartItemSchema`). That reuse is what makes "what
  the assistant may propose" identical to "what the cart accepts", so an accepted
  proposal cannot fail at the cart. The accept button is a promise.
- The model is asked for less than the API returns. Everything the backend can
  determine is filled in by `hydrateAiOrderingResponse`, because a field the
  model cannot emit is a field it cannot get wrong.

The second of those is the rule this change applies to `summary`, which breaks it
today.

Guides followed: `docs/agent/backend/architecture.md`,
`docs/agent/backend/unit-testing.md`, `docs/agent/workflows/verification.md`,
`docs/agent/workflows/feature-docs.md`. No deviation.

`packages/shared` contracts do not change. See decision 2.

## Goals / Non-Goals

**Goals:**

- The model can state an intention only in fields that execute.
- Every field the model is offered says what it is for.
- An operation that would change nothing never reaches the guest.
- A change to the answer shape is visible in the corpus.

**Non-Goals:**

- Decoupling the model's operations from the cart request contracts. The reuse
  is deliberate and stays; the user considered and kept it.
- Rewording the assistant's behaviour beyond the one line about fields.
- Making the guest-facing label translatable into the guest's own language. See
  the risk below — this design accepts the store's default locale.
- Any change to the four existing validation checks, the repair, or the
  confirmation gate.

## Decisions

### 1. Descriptions live on a model-facing wrapper, not on the shared schemas.

`modelResponse.ts` composes its operation shapes from the cart request schemas.
The descriptions are attached there — on the model-facing composition — rather
than on `cartItemInputSchema` and `updateCartItemSchema` in `packages/shared`.

Those shared schemas are the guest cart API's own request contracts. Prose
written to steer a language model does not belong in a contract the cart routes
validate against: it would be read by the wrong audience, and a future change to
it for the model's benefit would be a change to the public API's documentation.

So the reuse stays exactly as it is, and the descriptions sit one layer up.

Alternative considered: `.describe()` directly on the shared schemas, which is
less code. Rejected for the reason above.

### 2. The label is derived during hydration, not by the client.

`summary` leaves the model-facing schema. `hydrateAiOrderingResponse` composes
the label from the operation plus the menu and cart it is given, and fills it in
alongside `proposalId` and `operationId`.

The wire contract is therefore unchanged: the panel, the merchant review surface,
the stored proposal snapshot and the replay report all keep reading a label on
each operation. Only its author moves.

Alternative considered: removing the label from the wire entirely and composing
it in the web client, which has the menu, the cart and i18n, and would therefore
render it in the guest's own language. Rejected as the first step, not as an
idea: it requires the assistant panel to read the menu it does not read today,
and it changes four surfaces to fix a defect that this change closes without
touching any of them. Keeping the field on the wire does not foreclose it — the
client can stop using the server's label later.

### 3. "Changes nothing" is decided against the cart item, per field.

The check applies to `update_own_item` only. `add_item` always changes the cart,
and `remove_own_item` is rejected already when the item is not the guest's.

An update is a no-op when every field it supplies already matches the item:

- `quantity` equal to the item's current quantity
- `selectedOptions` equal as a set of `(modifierId, optionId)` pairs, order
  ignored, because order carries no meaning in a selection
- `notes` equal to the item's current note, and `notes: null` against an item
  that has no note

It is rejected like any other invalid operation, so it flows into the existing
single repair attempt and the model is told which change was empty. That is the
same degradation ladder, not a new one.

Alternative considered: dropping no-ops silently rather than rejecting them.
Rejected because the model is choosing to propose them, and a repair telling it
so is the signal that fixes the behaviour. Silent dropping would also make a
proposal of only no-ops indistinguishable from a model that proposed nothing.

### 4. The fingerprint hashes the model-facing schema's JSON Schema form.

The hashed material gains the serialized JSON Schema of the three tool argument
schemas, taken BEFORE any provider-specific rewrite.

Before the rewrite, because the fingerprint describes what this version asks of a
model, not how one vendor's parser spells it. A Gemini dialect fix must not read
as a version change, and the same version served through two providers must share
a fingerprint — the provider and model are recorded separately on every turn
precisely so that axis stays separate.

This makes the shape a frozen part of a stable version:
`aiOrdering.versions.test.ts` pins stable fingerprints, so changing the answer
shape of a released version now fails the suite, exactly as changing its prompt
does.

### 5. The prompt gains one line, and the draft's fingerprint moves.

`coreInstructions.ts` gains a statement that what a reply promises must appear in
the operation's own fields. The active version is a draft, which its own file
documents as editable; the fingerprint moving is the mechanism that keeps the
corpus readable across that edit, not a side effect to avoid.

The line is kept short and about the contract, not about notes specifically. A
rule naming one field would need extending for the next one.

## Risks / Trade-offs

- [The derived label uses the store's default locale, while the assistant's reply
  follows the guest's language] → A guest writing English at a Chinese-language
  store sees an English reply above a label built from a Chinese product name.
  Accepted: the label is built from the product's own name, which is the same
  string the menu shows that guest, and a label that is honest in the wrong
  language beats one that is fluent and false. Decision 2 leaves the client free
  to compose its own later.

- [A no-op check that is too strict rejects something a guest wanted] → It fires
  only when every supplied field already equals the item's value, so any real
  change keeps the operation. The risk is a model that proposes a real change
  plus a redundant field; that still passes, because the operation as a whole
  changes something.

- [Hydration gains dependencies on menu and cart, widening a pure function] →
  The caller already holds both for validation and passes them in the same call
  site, so nothing new is loaded. Hydration stays pure: same inputs, same label.

- [Field descriptions enlarge the prompt prefix and could cost cache hits] → Tool
  schemas are part of the request's stable prefix, not the per-turn blocks, so
  they are as cacheable as the instructions. The volatility ordering in
  `context.ts` is untouched.

- [`description` might not survive the rewrite into Gemini's OpenAPI subset] →
  The subset documents `description`, and `toGeminiToolSchema` passes unknown
  keywords through; a test pins that a described field arrives described.

## Migration Plan

1. No data migration. Stored turns keep the labels their proposals carried.
2. The draft version's fingerprint changes when the prompt line and the schema
   land. That is the intended signal: turns recorded before and after separate in
   the corpus, which is what makes a draft safe to edit.
3. No stable version exists yet, so nothing frozen is affected. Once one does,
   this change is what makes its answer shape as frozen as its prompt.
4. Rollback is a revert of the api slice alone; no contract or client changes to
   coordinate.
