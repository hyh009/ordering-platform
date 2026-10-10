## Why

The assistant told a guest it would add a spicy note to their 蔬菜蛋餅, the
proposal row said "更新蔬菜蛋餅並加上辣的備註", the guest accepted, the row
reported "已加入" — and no note exists. The stored raw model output says why:

```jsonc
"operations": [{
  "summary": "更新蔬菜蛋餅並加上辣的備註",
  "item": { "quantity": 1 },
  "type": "update_own_item",
  "itemId": "cart-item-44d9…"
}]
```

The intent went into `summary`, which is prose nobody checks. The arguments that
actually execute carried a quantity change to a value the item already had.
Every layer behaved correctly: the schema offers `notes`, validation passed, the
cart applied what it was given, and the panel reported what the cart returned.
The contract let the model describe an action instead of specifying one.

Four defects combine here, and each would survive the other three being fixed:

1. **The model-facing schema has no field descriptions at all.** `description`
   appears zero times in what the provider receives. The model is handed
   `summary` (string, 240) and `item.notes` (string, 500, nullable) with no
   statement of what either is for, and nothing distinguishing `notes: null`
   ("clear it") from omitting `notes` ("leave it alone") — two opposite meanings.
2. **`summary` is a place to speak that is never reconciled with what is done.**
   It exists only as a label on the proposal row, and the backend can derive it
   from the operation, the menu and the cart. By this module's own stated rule —
   a field the model cannot emit is a field it cannot get wrong — it should
   never have been model-authored.
3. **Nothing rejects an operation that changes nothing.** `{ quantity: 1 }` on an
   item already at quantity 1 is valid against the menu, valid against the cart,
   and completely pointless. It reached the guest as an action, and reported
   success.
4. **The version fingerprint does not cover the model-facing schema.** It hashes
   the prompt text and the limits, so changing the shape the model must answer in
   — half of the contract — leaves no trace in the evaluation corpus, and two
   runs with different schemas compare as if they were the same version.

## What Changes

- Every field in the model-facing schema states what it is for, what belongs in
  it, and what omitting it means. In particular: that an unset field in an update
  leaves that part of the item unchanged, and that `notes: null` clears a note
  rather than leaving it.
- The descriptions live on the model-facing schema only. The cart request
  schemas stay shared with the guest cart API — the reuse is what keeps the
  assistant from proposing something the cart would refuse — but model-facing
  prose does not leak into that shared contract.
- **BREAKING (model contract)** `summary` is removed from what the model emits.
  The backend derives the proposal row's label from the operation, the menu and
  the cart during hydration, the same way it already supplies `proposalId`,
  `operationId` and `confirmationRequired`.
- The wire contract keeps a per-operation label, so the panel, the merchant
  review surface, the stored corpus and the replay report are unchanged. Only
  its author changes.
- Validation gains a check: an operation SHALL change something. An update whose
  fields all match the item's current values is rejected like any other invalid
  operation, which routes it into the existing single repair attempt rather than
  to the guest.
- The version fingerprint covers the model-facing schema, so a change to the
  shape the model answers in separates the corpus the way a prompt edit does.

Deliberately unchanged: the cart request schemas stay shared; the four existing
validation checks; the single repair attempt; the confirmation gate; and the
assistant's operation set.

## Capabilities

### New Capabilities

<!-- None. This tightens how an existing capability behaves. -->

### Modified Capabilities

- `ai-ordering-assistant`: adds requirements that the model-facing contract
  documents each field, that a proposed operation must change something, and
  that a proposal's per-operation label is backend-authored rather than model
  authored. Modifies "Proposals are validated before the guest sees them" to
  include the no-op check. No requirement is removed.

## Impact

`packages/shared`: no change. The operation contract keeps its label field; the
cart request schemas keep their current shape and stay shared.

`apps/api`:

- `modules/aiOrdering/modelResponse.ts` — field descriptions, `summary` removed
  from the model-facing operation schema, and label derivation added to
  hydration. Hydration gains the menu and the cart as inputs, which the caller
  already holds for validation.
- `modules/aiOrdering/validation.ts` — the no-op check and its rejection code.
- `modules/aiOrdering/versions/fingerprint.ts` — the model-facing schema joins
  the hashed material.
- `modules/aiOrdering/prompts/coreInstructions.ts` — a line stating that what a
  reply promises must appear in the operation's own fields. The active version is
  a draft, so its prompt may be edited; this moves its fingerprint, which is
  what the fingerprint is for.
- `runtime/geminiSchema.ts` — confirm `description` survives the conversion into
  Gemini's OpenAPI subset. No change expected; a test pins it.

`apps/web`: no change. The label still arrives on the wire.

Sequencing: this builds on `apply-ai-ordering-proposals-server-side`, which is
implemented but not archived. The archive order is
`add-ai-ordering-assistant` → `improve-ai-ordering-cart-visibility` →
`apply-ai-ordering-proposals-server-side` → this one.
