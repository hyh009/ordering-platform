## Context

The guides this follows: `docs/agent/backend/architecture.md` for the cart and
order slices, `docs/agent/workflows/shared-contracts.md` for the contract
change, and `docs/agent/frontend/architecture.md` with
`docs/agent/frontend/state-ownership.md` for the two web surfaces. No deviation
is intended.

`packages/shared` changes: yes. The cart item input, the cart item DTO and the
order item DTO each gain one optional field. Nothing is removed and nothing
changes meaning, so every stored record and every existing client stays valid.

The behaviour being fixed is in `apps/api/src/modules/aiOrdering/modelResponse.ts`,
where the note field's description carries the whole weight of keeping additions
out of notes and loses. The fix is not in that description. It is that the thing
the description is trying to prevent currently has nowhere else to go.

## Decisions

### 1. A new field, not a second meaning for the note

The dividing question is **does the store have to decide?**

A note is a subtraction or an adjustment the kitchen absorbs while making what
was ordered: an ingredient left out, how done something should be, an allergy it
must know about. It needs no answer. The store reads it and cooks.

An off-menu request is something the store would have to agree to provide, and
possibly price: an extra egg, a larger bowl, a substitution the menu does not
model. It is not a variation of what was ordered; it is a question about it.

Overloading `notes` with both would mean the merchant cannot tell, from the
field alone, whether they are being informed or asked. That distinction is the
entire value of the change, so it is carried by the schema and not by the
reader's interpretation of a sentence.

### 2. It is never priced

The field adds nothing to the item's price and nothing to the order total. The
system charges nothing for it, ever.

This is what keeps the change small enough to be correct. The moment a request
can carry money, it needs the guest to agree to the amount, which needs the
store to propose one, which needs a negotiation, a state machine and a
notification — all of which is decision 8. A store that wants to provide the egg
and charge for it modifies the order, where the guest already sees and accepts a
changed total.

The consequence to accept deliberately: a store may provide something for free
that it would rather have charged for. That is a smaller harm than a guest being
billed for something they never agreed to, and the store can always decline.

### 3. Per item, not per order

加蛋 is an egg on **that** bowl of noodles. With two bowls in the cart, an
order-level field cannot say which. The field sits on the cart item and travels
to the order item, beside the note it is distinguished from.

An order-level request — cutlery, takeaway, a delivery instruction — is a real
and separate need, and is not this change.

### 4. The guest writes it, and so does the assistant

Both already write notes: the guest in the product configuration sheet, the
assistant in a proposed operation. The new field follows the same two paths,
with no third mechanism. The guest's own request is the primary case; the
assistant filling it is what closes the model defect.

Nothing about the field is assistant-specific, which is why it is specified as
its own capability rather than as part of the assistant's.

### 5. It does not block order submission

An order carrying an unanswered request submits normally. Blocking would make an
unanswerable question into a broken checkout, and the request is explicitly
best-effort. The guest is told it may not be available before they submit, which
is the honest version of the same information.

### 6. The merchant must be able to see it, in this change

A field whose guest-facing copy says the store will look at it, with no screen
on which the store can look, is a promise the system does not keep. That is
worse than having no field, because the guest stops asking the staff.

So the merchant order detail rendering it is part of this change, not a
follow-up. The notes are rendered in the same place and the same pass — each
item's note, and the order-level note written at checkout. They are the same
kind of thing, written by the same guest, for the same reader, and they reach no
screen today either. Doing one without the other would leave the merchant seeing
the question and not the instruction.

### 7. Guest-facing wording promises nothing

The copy says the request has been passed to the store and may not be available.
It never says confirmed, accepted, agreed or included, and the request is never
rendered as part of what was ordered — not in the item's option line, not in the
total, not in the order summary. It is rendered as a pending question.

This is also the wording the assistant is told to use in its reply, so the two
surfaces cannot disagree about what was promised.

### 8. The store answering is out of scope, on purpose

Accepting or declining a request, adjusting the price because of one, and
telling the guest the outcome are all absent here.

They belong with merchant order modification, which is parked pending its own
decisions. Specifying a negotiation now would either duplicate that work or
constrain it from the outside. What this change delivers is the request being
asked, carried, and seen — which is what the guest needs and what the model
needs, and it is useful on its own: the store answers out loud, the way it does
now, and the request is on the screen when they do.

### 9. The note description shrinks to a route

Its eight negations exist because there was nowhere to send an addition. There
is now, so the description names it and stops arguing. The surrounding
instructions keep owning the situation; the field description keeps owning what
the field may hold.

This is the lesson from three previous prompt defects on this feature, applied
in the other direction: a rule stated in prose loses to the shape of the data
the model is given. Here the shape was a field that accepted anything and a
sentence asking it not to. Changing the shape is the fix, and the sentence gets
shorter as a result rather than longer.

### 10. Naming

`offMenuRequest`, singular, optional, trimmed, capped like a note is. It says
what the field holds — a request for something off the menu — without claiming
what will happen to it, which `specialRequest` and `storeApproval` both do.

### 11. The web model layer needs no work for the item field

Both `src/models/cart` and `src/models/order` assign `items: dto.items` whole in
`deserialize`, so a new field on an item arrives on both sides with no mapping
to write.

Recorded because it looks like a DTO leak and is not one.
`docs/agent/frontend/model-dto-boundary.md` makes the alias deliberate: the
boundary is `deserialize`, not the type, and a value that has passed it is a
model. Converting the items per field would be a codebase-wide change to that
convention — `Order` is `OrderDto` and some 38 files import it — and has nothing
to do with this feature.
