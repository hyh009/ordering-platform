## Context

See `proposal.md` — Why. The defects and their evidence are not restated here.

What matters for the approach is a rule this module already follows and this
change extends: **a field the model cannot emit is a field it cannot get wrong.**
`hydrateAiOrderingResponse` fills in everything the backend can determine, which
is why the model supplies no `proposalId`, no `summary` and no option ids today.

A product card is almost entirely determinable. Its name, price, image,
description, sold-out mark and allergens are in the menu the page already loaded.
The only thing the model knows that the backend does not is WHICH products the
guest should be looking at. So that is the only thing it is asked for.

Guides followed: `docs/agent/backend/architecture.md`,
`docs/agent/workflows/shared-contracts.md`,
`docs/agent/frontend/architecture.md`,
`docs/agent/frontend/state-ownership.md`.

`packages/shared` changes: yes — one new variant on the assistant response
union, and a lowered cap on `choices.options`.

## Decisions

### 1. Ids only; the client renders from menu data

The tool takes `categoryId` or `productIds`, never a name, a price or a
description.

A model-authored product list is a hallucination surface with no upside: the
page is already holding the menu that produced those ids, so anything the model
wrote would at best agree with it and at worst contradict it on a price. It also
keeps the response small, which matters because a category of twelve would
otherwise repeat twelve products of menu text the prompt already contains.

The consequence to accept: a card cannot say anything the menu does not already
say. If the assistant wants to explain WHY it is showing these, that belongs in
`reply`, which is prose the guest reads as the assistant speaking — not as data
about a product.

### 2. Showing is not proposing, and a turn is still one answer

`show_products` never changes the cart and never appears beside a proposal. A
turn produces exactly one answer, as it does today.

This is the decision that fixes 鐵板麵. The assistant put two products in the
cart because the only way to show a guest two things was to propose both. With a
way to show that does not touch the cart, "here are the two kinds" stops being
a cart change. It also means the guest's add goes through the product sheet —
the path that already validates modifiers, quantities and sold-out state — so
nothing new has to be validated on the way in.

Alternative rejected: letting one turn show cards AND propose. It would restore
the ambiguity about whether the assistant acted, which the proposal contract
spends several rules removing.

### 3. A category is not capped; a hand-picked list is capped at eight

These are different risks, so they get different rules.

A category is a closed set the merchant authored. Showing all of it cannot be
short and cannot be wrong, and twelve cards in a scrolling row is the shape that
fits twelve flavours — which is precisely what `ask_choices` could not do.

A hand-picked list is the model deciding what is relevant, where a long list is
evidence it has not decided. Eight is the point past which it should be naming a
category instead.

### 4. `ask_choices` drops to five options

Once product lists have their own home, `ask_choices` is for choosing between a
few readings of an utterance. Five is generous for that.

The cap is also a signal, not just a limit: the smaller it is, the sooner the
model meets the wall that tells it this is the wrong tool. Eight was large
enough to look usable for a twelve-product menu, which is how the original
defect began.

### 5. Validation is a join against the menu, not a judgement

A `show_products` response is checked against the same menu the context was
built from: every `productId` must exist, a `categoryId` must exist and have at
least one product. A failure is a rejection with a detail, repaired the way a
bad proposal is.

This is the kind of check that is worth having — matching ids against a closed
set the system owns, with no natural language in it. The costly direction, a
false positive, is bounded: the model is asked again.

What is deliberately NOT checked: whether these are the RIGHT products for what
the guest said. That is the open-ended judgement no check can make, and the one
that belongs to the prompt.

### 6. Cards live in the transcript, not the dock

The dock holds the one thing waiting on the guest — a proposal to decide, a
question to answer. Cards are not waiting on anything: a guest may read them,
scroll past them, keep talking, and come back.

Putting them in the transcript also means several card rows can coexist across a
conversation, each still readable in the place it was offered, which is how the
exchange reads back later.

### 7. Sold-out products are shown, marked

They are part of the honest answer to "what kinds are there", and `ProductCard`
already renders and disables them. Hiding them would make the assistant's list
disagree with the menu page on the same screen.
