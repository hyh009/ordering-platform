## Context

Guides followed: `docs/agent/backend/architecture.md`,
`docs/agent/workflows/shared-contracts.md`, the frontend layering in
`CLAUDE.md`, and `docs/agent/frontend/model-dto-boundary.md`.
`packages/shared` changes: yes.

`show_products` is a path to the cart that runs entirely in the client — card →
configuration sheet → cart, no model call in it. That is what makes it instant
and what makes it safe. It is also why nothing the assistant said survives the
tap, and why a question asked alongside the cards can never be answered.

### What the first version of this change got wrong

It proposed that the model name the options the guest had stated, that the
server join them against the shown products, and that a tap open the sheet with
those options pre-ticked. Measurement against the real model showed:

1. The model was already answering correctly — twelve cards plus
   `請問您想要哪一種蛋餅呢？`. There was no model defect to fix.
2. The model already reads which products offer which option: `context.ts`
   renders `choices: <modifierId> (加料)` on every product. The join added no
   information for the model, only for the guest.
3. The client already holds the whole public menu, so even the guest-facing
   join needed no new wire field.
4. So the only field that could not have been derived was "which option did the
   guest's sentence name" — and under this change not even that is needed,
   because the model re-reads it from history when it proposes.

The lesson is the one this feature keeps relearning from the other direction:
the four attempts before this all asked the model to fill a field. The axis it
is stable on is which tool to call.

## Decisions

### 1. A new tool, not a field and not a mode flag on `show_products`

Asking versus showing is a judgement about what the guest wants, made once per
turn. Expressed as a tool choice it sits on the model's reliable axis.
Expressed as a boolean on `show_products` it becomes a field — and a field on a
tool the model already calls correctly is a new way to get the existing case
wrong.

The rejected alternative is extending `ask_choices` to offer products. It would
fix the five-option truncation at the same time, which is genuinely tempting.
Rejected because every existing consumer of a `choices` response would have to
handle a shape it has never seen, and because the five-option cap is correct for
the thing `ask_choices` is: a question answerable by reading labels.

### 2. `show_products` does not change at all

Not its schema, not its description, not its client behaviour. A guest who asks
`蛋餅有哪幾種` taps a card and gets the sheet, with no model call and no
confirmation step.

This is the load-bearing decision. The new path costs a round trip to the model
plus a proposal to confirm; making browsing pay that would trade a defect in one
case for a slowdown in the common one.

### 3. A tap on a product question is a turn, through the path that already exists

Answering a choice question already sends `message` plus `responseToPromptId`
plus `selectedOptionId`. A tapped product sends the same request with the chosen
product instead, and appears in the transcript as the guest's own turn — because
that is what it is.

No new endpoint, no new conversation mechanic, and nothing for the rate limiter,
the checkpointer or the history window to learn.

### 4. The tapped product travels as an identifier, in its own field

`selectedProductId`, not reuse of `selectedOptionId`. A product id and an option
id validate against different parts of the menu and mean different things; one
field holding either would have to be disambiguated from the prompt it answers,
which is exactly the kind of implicit coupling that goes wrong on a reload.

The `message` text still carries the product's name, so the transcript reads
properly and the model has prose as well as an id — but the id is what is
authoritative.

### 5. The stated option is NOT carried back to the model

Already measured: routed through `ask_choices`, the next turn proposes
`+ 原味蛋餅 ×1 · 雞塊` from history alone. Adding a field to re-tell the model
something it just said would be making it a relay.

If this turns out to be unreliable in practice, the fix is a regression case
and a prompt line about reading back what the guest asked for — not a field.

### 6. The answer produces a proposal, and the guest confirms it

The tap does not add to the cart. The model proposes, the proposal is validated,
and it goes through the same human-in-the-loop confirmation as every other
proposal.

The tempting shortcut is to apply it immediately, since the guest did just tap
the thing they want. Rejected: the guest tapped a *product*, and what gets added
is a product plus an add-on plus whatever defaults the model chose for the
remaining choices. They have not seen that line yet. The proposal card is where
they see it.

### 7. A product question is not capped at five

`ask_choices` caps at five because a wall of labels is unreadable. Cards scroll
horizontally, which is why `show_products` is allowed up to a whole category.
A product question inherits the card bound, not the label bound — so twelve
kinds are asked about whole, and the 5-of-12 truncation does not reappear in a
new place.

### 8. The response type is its own literal, not a flag on `products`

The client must branch on cards-that-open-a-sheet versus cards-that-answer, and
that difference is the entire point of this change. Branching on a stable type
is what `docs/agent/` asks of every other response; a boolean beside an
identical payload would make two unrelated behaviours one type.

Named `productQuestion`, camelCase, matching the field style of the contract
file. It is the first multi-word response type; the alternative was overloading
a single word until it covered both behaviours, which is what the type exists to
prevent.

### 9. The badge is out of scope, and smaller than it was if revisited

A mark on each card reading `+雞塊 $20` tells the guest, before they choose,
which crepes can take nuggets. That is real value: it saves the round trip of
「我要這個」→「這一種沒有雞塊」.

It is not what closes this hole, and it is cheaper than the reverted design
assumed. If it is done later it needs one field — which option the guest's
sentence named — and nothing else: the client joins against the menu it is
already rendering, and `optionCarries` does not belong on the wire.

### 10. A product question that can no longer be answered is closed, not silently inert

The store shuts, the product sells out, the ordering session ends, or a later
turn supersedes the question. In each case the cards stop being answerable and
say why, the same way a superseded proposal does rather than failing on tap.

### 11. Typing instead of tapping keeps working

A product question permits free text, like a choice question. `原味的` is a
message; the model reads it against the question in history. Nothing special is
needed, and it is pinned so no future change makes the cards the only way out.
