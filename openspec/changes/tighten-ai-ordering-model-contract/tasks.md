API only. No `packages/shared` change and no `apps/web` change — see design
decisions 1 and 2.

## 1. Document the model-facing contract

- [ ] 1.1 Add a description to every field in `aiOrderingModelArgumentSchemas`
  (`modules/aiOrdering/modelResponse.ts`), composing them onto the model-facing
  shapes rather than onto `cartItemInputSchema` / `updateCartItemSchema` in
  `packages/shared`; verify by test that the shared cart schemas carry no
  description, so model-facing prose cannot leak into the guest cart API's
  contract
- [ ] 1.2 State in the `item` descriptions that an omitted field leaves that part
  of the item unchanged, and that `notes: null` clears an existing note while
  omitting `notes` keeps it; verify a test asserts both meanings are present,
  since they are opposite and the model has nothing else to infer them from
- [ ] 1.3 Verify every field offered to the model is described, by a test that
  walks the generated JSON Schema and fails on any property without a
  `description` — a new field must be documented rather than merely added
- [ ] 1.4 Verify `description` survives `toGeminiToolSchema`, by a test that
  converts a described schema and asserts the key is still there; the subset
  documents it, but the rewrite is ours and nothing pins it today

## 2. Take the label away from the model

- [ ] 2.1 Remove `summary` from the model-facing operation schema in
  `modelResponse.ts`; verify a test shows the model cannot supply a label — an
  output carrying one is accepted with the label ignored, not written through
- [ ] 2.2 Add label derivation from an operation plus menu and cart, covering
  add, update and remove, and naming what actually changes on an update; verify
  unit tests for each operation type, including an update that changes only the
  note and one that changes quantity and options together
- [ ] 2.3 Thread menu and cart into `hydrateAiOrderingResponse` and fill the
  label there, beside `proposalId` and `operationId`; verify the existing
  hydration tests still pass and a new one asserts the label describes the
  operation's own fields
- [ ] 2.4 Verify the wire contract is unchanged: `grep -rn "summary" packages/shared/src/contracts/aiOrdering.ts`
  still shows the operation label, and `pnpm --filter web run build` passes with
  no web change
- [ ] 2.5 Verify the replay report still summarises a proposal's operations
  (`evaluation/replay.ts`), now from the derived label rather than the model's

## 3. Reject an operation that changes nothing

- [ ] 3.1 Add a rejection code for an operation that changes nothing, alongside
  the existing validation rejection codes in `modules/aiOrdering/validation.ts`;
  verify the code is distinct so the repair note can say what was wrong
- [ ] 3.2 Implement the check for `update_own_item`: reject when every supplied
  field already matches the cart item, comparing `selectedOptions` as an
  unordered set of `(modifierId, optionId)` pairs and treating `notes: null`
  against an item with no note as no change; verify tests cover a no-op quantity,
  a no-op option set in a different order, a no-op note, a no-op note clear, and
  a real change that must survive
- [ ] 3.3 Verify a proposal whose operations are all no-ops degrades to the
  model's own reply rather than an empty proposal, which is the existing ladder
  and must not grow a fourth rung
- [ ] 3.4 Verify the rejection reaches the repair note, by a test asserting the
  note names the empty change so the model is told what to fix rather than asked
  to retry blind

## 4. Make the answer shape part of the version

- [ ] 4.1 Add the serialized JSON Schema of the three tool argument schemas to
  the hashed material in `versions/fingerprint.ts`, taken BEFORE any
  provider-specific rewrite; verify a test shows two provider dialects of one
  version share a fingerprint, so a Gemini-only fix cannot read as a version
  change
- [ ] 4.2 Verify a test shows that changing a model-facing schema changes the
  fingerprint, and that changing only `timeoutMs` still does not
- [ ] 4.3 Update the fingerprint comment in `versions/fingerprint.ts` to state
  that the answer shape is hashed and why the provider dialect is not; verify the
  "Deliberately NOT part of the hash" list still reads as a complete account
- [ ] 4.4 Verify `aiOrdering.versions.test.ts` would now refuse a change to a
  stable version's answer shape, by pinning a fingerprint in a test fixture and
  asserting a schema edit breaks it

## 5. Prompt and documentation

- [ ] 5.1 Add one line to `prompts/coreInstructions.ts` stating that what a reply
  promises must appear in the operation's own fields; keep it about the contract
  rather than about notes, so the next field does not need a second line; verify
  the draft version's fingerprint changes, which is the signal that keeps the
  corpus readable across the edit
- [ ] 5.2 Update `docs/features/ai-ordering.md`: the model-facing contract is
  documented field by field, the proposal label is backend-derived and why, the
  no-op check joins the validation list, and the fingerprint now covers the
  answer shape; record the locale trade-off on the derived label per
  `docs/agent/workflows/feature-docs.md`
- [ ] 5.3 Add a manual check for the case this change came from: ask the
  assistant to add a note to an item already in the cart, accept, and confirm the
  note appears on the item — and that a proposal promising a note it did not
  specify never reaches the guest
- [ ] 5.4 Verify the api slice per `docs/agent/workflows/verification.md`:
  `pnpm --filter api run lint`, `pnpm --filter api run build`, and
  `pnpm --filter api run test`, confirming the suite still runs with the AI env
  vars blank
