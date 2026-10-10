## Why

A guest asked for 牛肉麵不辣，加蛋 at a store that sells no egg, in any form, on
any product. The assistant proposed the noodles correctly and wrote 加蛋 into the
item's note. Its own reply said, in the same breath, that egg is not something
the store offers and the guest should ask the staff.

That is the defect in one line: the model knew the answer and still wrote the
request somewhere it does not belong. A note is not an addition — nothing is
made for it, nothing is charged for it, and an addition written in one is an
addition the guest never gets. On a `--match` rerun it reproduced 3 times in 4,
so it is unstable and leaning wrong, not an outlier.

The note field's own description already forbids this at length: a hundred and
sixty words and eight negations, with an exit buried in them that amounts to
"say it in your reply and write nothing". The model does say it in its reply.
Then it writes the note anyway, because 加蛋 is a thing the guest asked for and
the note field is the only container in the system that will accept it.

So the fix is not a stronger prohibition. It is a container. A guest wanting
something the menu does not sell is an ordinary thing to want, and the store —
not the model and not the note field — is who can answer it.

Doing this surfaced a second hole, already present and unrelated to the
assistant: **nothing a guest writes for the store reaches a merchant screen
today.** An item's note rides to the merchant client inside the order's items,
and the order-level note the guest writes at checkout is mapped onto the order
model at `apps/web/src/models/order/model.ts:33` — and the merchant order detail
page renders neither. A guest writing 不要蔥 is writing to nobody.

## What Changes

- A cart item gains a request for something the menu does not offer, separate
  from its note. The two are divided by one question: does the store have to
  decide? A note is a subtraction or an adjustment the kitchen absorbs. This is
  a request only the store can answer.
- The field is **never priced**. It adds nothing to the total, and the system
  charges nothing for it. A store that wants to provide it and charge for it
  does so by modifying the order, which is a separate, already-planned path.
- The merchant order detail shows it, and shows the notes alongside it — each
  item's note, and the order-level note the guest writes at checkout. All three
  are things a guest wrote for the store to read, and today none is read.
- The guest can write it themselves in the product configuration sheet, and the
  assistant can fill it in a proposal, exactly as both already write notes.
- The note field's model-facing description loses its burden: instead of
  forbidding additions in eight clauses, it names the field additions go to.
- Guest-facing wording promises nothing. It says the request has been passed to
  the store and may not be available. It never says confirmed, accepted, or
  included.

Deliberately **not** in this change, and listed so a reader knows it was
weighed: the merchant accepting or declining a request, any price adjustment
arising from one, and telling the guest the outcome. Those belong with merchant
order modification, which is parked. See design decision 8.

## Impact

- `packages/shared` — the cart item and order item contracts gain the field. See
  `docs/agent/workflows/shared-contracts.md`.
- `apps/api` — the field on the cart and order entities and their mappers, on the
  model-facing proposal schema, and in proposal validation; the note
  description rewritten; the operation label rendering it distinguishably from a
  note.
- `apps/web` — the storefront configuration sheet gains an input; the merchant
  order detail renders the field and item notes.
- The version fingerprint changes: the model-facing field set is part of it.
- Existing carts, orders and stored turns are unaffected — the field is optional
  and absent on everything written before it existed.
