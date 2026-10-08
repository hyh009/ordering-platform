## Context

`show_products` put twelve egg crepes in front of a guest who had asked for
蛋餅加雞塊, and the nuggets went nowhere. The row is a path to the cart that runs
entirely in the client: card → configuration sheet → cart, with no model call in
it. That is what makes it instant and what makes it safe — the assistant
proposes nothing — and it is why nothing the assistant knows survives the tap.

Giving the model a memory does not fix this. It already has one: the history
window and the rolling summary carry 加雞塊 across turns, and a replay confirms
the model proposes `+ 原味蛋餅 ×1 · 雞塊` when the clarification goes through
`ask_choices`. The information is not forgotten. Nobody asks for it, because the
tap produces no turn. For something to act on a stated choice in this path, it
has to be a value the CODE can read, which means an identifier and not a
sentence.

## Decisions

### 1. The model names options by id; the server does the matching

The tool takes the ids of options the guest stated. The model's whole job is to
say WHICH option in the menu the guest named — the thing it is good at, and the
thing it is already trusted with everywhere else ids appear.

Deciding which of the shown products can take that option is a lookup in data we
own. Doing it in the model would be asking it to hold twelve products and their
modifiers in its head and report a join, which is both wasteful and the kind of
answer that is wrong invisibly.

### 2. Matching is identifier equality, and nothing else

A product carries a stated option when the product's `modifierIds` contains the
modifier that owns that option. No name comparison, no fuzzy fallback.

This works because a modifier is a shared record: a store that offers nuggets on
its crepes models one 加料 modifier and lists it on each crepe. A store that
instead gives every product its own modifier gets no carried options, and its
guests are exactly where they are today. That is a gap, not a regression.

The rejected alternative is matching by option NAME when the id does not
resolve. It would cover the per-product-modifier store, and it would do it by
comparing two localized strings and hoping they mean the same thing. A wrong
match there puts something on a plate that the guest never asked for, and
nobody can see that it happened. A join on ids can only fail by carrying
nothing, which is visible.

### 3. The card shows what it carries, not only the sheet

The guest decides which crepe they want while looking at the row. A carried
option revealed only after the tap arrives after the decision, and a product
that cannot take it reads as the system having forgotten rather than as the
store not offering it.

So the badge belongs on the card, with the option's name and its price
adjustment, and the difference between a marked and an unmarked card is the
answer to "can I have nuggets on this one".

It is rendered by the assistant's row, not by `ProductCard`. The menu grid never
has a carried option, and the shared card should not grow a concept that only
one of its two callers can ever use.

### 4. A product that cannot take the option is still shown

Filtering the row down to the products that can take the add-on would answer
"what kinds of 蛋餅 are there" with a shortened menu. A qualifier is not a
reason to hide what the store sells. It is a reason to mark what it can do.

### 5. A stated option no product can take is reported, not dropped

When nothing in the shown set carries an option, the response says so. The panel
can then tell the guest, rather than showing twelve unmarked cards that look
like an ordinary browse.

This is the same rule the rest of this feature follows: a silent drop is the
failure mode worth spending a field to avoid.

### 6. Carried options are selected and changeable, never decided

The sheet opens with the option ticked, visibly, among the product's own
choices. The guest can untick it. Nothing is added to the cart until they
confirm, exactly as before — what changes is where the sheet starts.

### 7. The scope is this response, not the conversation

A stated option applies to the products shown in answer to the message that
stated it. It does not become a preference the next product the guest opens
inherits.

A sticky preference is tempting: "我不吃蔥" at turn two should plausibly hold at
turn nine. It is rejected here because its failure mode is the worst one this
feature has — an item silently differing from what the guest chose in the moment
they chose it, on a surface where the assistant is not even present to explain.
If that is wanted it is its own change, with its own visibility rules.

### 8. The model may state an option without knowing the product

`我要蛋餅加雞塊` names an add-on before any crepe has been chosen. That is the
whole case, so the field takes options alone and never option-plus-product
pairs: a pair would force the model to pick a product, which is precisely what
it must not do when it is about to show twelve.

The cap is small — three — because a guest stating four conditions while
browsing is asking for a proposal, not a row of cards.
