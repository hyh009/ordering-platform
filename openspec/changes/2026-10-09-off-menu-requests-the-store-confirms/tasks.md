Five slices in dependency order: shared contract, api, the assistant's share of
the api, storefront web, merchant web. Each ends with its own verification per
`docs/agent/workflows/verification.md`.

## 1. Shared contract

- [ ] 1.1 Add `offMenuRequestSchema` to `packages/shared/src/contracts/cart.ts`
  beside `cartItemNotesSchema`, with the same trim and length treatment. Put the
  dividing question in the comment — a note is absorbed, a request is answered —
  so the next reader does not have to find this change to know which to use
- [ ] 1.2 Add the field to `cartItemInputSchema` as optional, and to
  `updateCartItemSchema` as nullable-optional, matching how `notes` distinguishes
  omitting from clearing
- [ ] 1.3 Add the field to `CartItemDto`. The order contract carries order items
  as `CartItemDto`, so the submitted order inherits it with no second definition
- [ ] 1.4 Verification: `pnpm --filter @repo/shared run build`

## 2. API — cart and order

- [ ] 2.1 Add the field to the cart item entity and its mapper, and to the
  cart-item create and update services, following
  `docs/agent/backend/architecture.md`
- [ ] 2.2 Confirm by test that the field survives submission onto the order item,
  and that it is the item's own value and not the order's
- [ ] 2.3 Assert in a pricing test that an item's total, the subtotal, the
  service fee and the order total are identical with and without the request
  (spec: never priced). This is the requirement most likely to be broken later
  by someone adding a price to it, so it is pinned by a test and not by prose
- [ ] 2.4 Confirm submission succeeds with an unanswered request present
- [ ] 2.5 Verification: `pnpm --filter api test`, typecheck, lint

## 3. API — the assistant

- [ ] 3.1 Add the field to the model-facing add and update schemas in
  `modelResponse.ts`, described as what the guest asked for that the store
  offers neither as a product nor as a choice
- [ ] 3.2 Rewrite `NOTES_DESCRIPTION_BASE` to name that field as where an
  addition goes, and delete the enumeration of what a note may not contain. Keep
  what a note IS. The description gets shorter: its length was compensating for
  a missing destination
- [ ] 3.3 Keep the instruction about what the reply must say, and make it say
  "the store has been told, and it may not be available" — the same promise the
  guest-facing copy makes. One sentence, in the field description that owns it,
  and nowhere else
- [ ] 3.4 Render the request in `operationLabel.ts` distinguishably from a note,
  so the guest reviewing a proposal can tell a question from an instruction.
  Decide the marker when the guest-facing copy is written in 4.2 and use the
  same one
- [ ] 3.5 Validation: an off-menu request naming something the menu DOES offer is
  not a schema error and SHALL NOT be repaired automatically — the model chose
  wrongly between two valid fields, and silently rewriting it would hide that
  from the regression suite. Decide at implementation time whether this is a
  rejection with its own code or a recorded quality signal, and say which in the
  task's commit
- [ ] 3.6 Regression cases on the fixture menu, which offers no egg: expect
  `牛肉麵不辣，加蛋` to produce one add whose note is unset and whose off-menu
  request mentions the egg. Keep the existing `不要蔥` case unchanged and
  passing — it is the control, and the two must not converge
- [ ] 3.7 Print the off-menu request on the replay outcome line, distinguished
  from the note, so the two cases above can be read at a glance
- [ ] 3.8 Verification: `pnpm --filter api test`, typecheck, and a replay of the
  two cases above. `加蛋` is currently unstable at 1 pass in 4, so run it with
  `--match` several times and record the ratio, not a single result
- [ ] 3.9 Note in the version registry that the fingerprint changed, as the
  model-facing field set is part of it

## 4. Web — storefront

- [ ] 4.1 Nothing to do in `src/models/cart` either: `model.ts:15` passes
  `items` wholesale for the same reason. The order-level note at 5.3 is the one
  value that IS individually allowlisted, and it is already there
- [ ] 4.2 Add the input to `ProductConfigSheet`, separate from the note input and
  labelled as a request the store has to answer. Write the guest-facing copy
  here: told to the store, may not be available, never accepted. New i18n keys
  use English default strings
- [ ] 4.3 Show it on a cart item as a pending question, outside the chosen-option
  line and outside every total (spec: not an ordered thing)
- [ ] 4.4 Show it the same way on the assistant's proposal card, using the label
  the API produced in 3.4 rather than re-deriving it
- [ ] 4.5 Tests: adding with a request, clearing it on edit, and a snapshot or
  assertion that the displayed total is unchanged by it
- [ ] 4.6 Verification: `pnpm --filter web test`, typecheck, lint, and
  `docs/agent/frontend/architecture-validation.md`

## 5. Web — merchant

- [ ] 5.1 Nothing to do in `src/models/order`. `deserialize` assigns
  `items: dto.items` wholesale, so an item's note and its off-menu request
  already arrive — and per `docs/agent/frontend/model-dto-boundary.md` a value
  that has passed `deserialize` is a model, not a leak. Confirm that and move on;
  do not add a per-field allowlist for items as part of this change
- [ ] 5.2 Render each item's off-menu request on `OrderDetailPage`, against its
  item and visually distinct from a note
- [ ] 5.3 Render each item's note, and the order-level note, on the same page.
  Neither reaches any merchant screen today, which is the hole this closes
- [ ] 5.4 Tests: an order with a note and a request on the same item shows both,
  distinguishably; an order with neither shows no empty section
- [ ] 5.5 Verification: `pnpm --filter web test`, typecheck, lint, and
  `docs/agent/frontend/architecture-validation.md`

## 6. By hand

- [ ] 6.1 As a guest: add an item with an off-menu request from the product
  sheet, confirm the total did not move, submit, and confirm it appears on the
  merchant order detail against the right item
- [ ] 6.2 Through the assistant: order a dish and ask to add something the store
  does not sell. Confirm the proposal sets the request and not the note, that
  the reply promises nothing, and that accepting it does not change the total
- [ ] 6.3 Through the assistant: ask for an ingredient to be left out, and
  confirm it is still a note
