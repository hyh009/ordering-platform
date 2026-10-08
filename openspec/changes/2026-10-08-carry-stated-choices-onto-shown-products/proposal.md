## Why

A guest asked for 蛋餅加雞塊 at a store that sells twelve egg crepes and offers
nuggets as an add-on. The assistant showed the twelve as product cards, which is
the right answer: twelve is more than a question may offer, and `show_products`
exists for exactly that. The guest tapped a crepe, the configuration sheet
opened, and the nuggets were not there. They added the crepe without them.

This is not the model failing. The model never got the chance: a tap on a
product card is not a message, so no turn happens between the card and the cart.
`show_products` is deliberately a path that bypasses the assistant — that is its
virtue, the guest adds the item themselves and nothing is proposed — and the
cost is that it bypasses everything the assistant knows. The same request
answered with `ask_choices` carries the add-on correctly, because the guest's
answer IS a message and the next turn proposes with it.

So the hole is structural and it fires every time, not sometimes. Anything the
guest states alongside a request to SEE a kind of dish is dropped on the floor:
"蛋餅加雞塊", "飲料我要無糖", "鐵板麵不要辣".

The guest made one request with two parts. The system can only answer the first.

## What Changes

- `show_products` gains the options the guest already stated, as option
  identifiers from the menu. The model names them; it never writes them as text.
- The server resolves each stated option against every product it is about to
  show, and says which products can take it. This is a join on the store's own
  identifiers, not a judgement about language.
- A card in the assistant's row shows what it carries — `+雞塊 $20` — so the
  difference between a crepe that can take nuggets and one that cannot is
  visible while the guest is comparing cards, which is where they choose. A
  product that cannot take it is still shown, unmarked; the menu does not shrink
  because of a qualifier.
- Opening such a card opens the configuration sheet with those options already
  selected and changeable. The guest confirms or removes them.
- A stated option that no shown product can take is reported as such, so the
  panel can say so instead of dropping it silently.

## Impact

- `packages/shared` — the `products` response variant gains the resolved stated
  options and which products carry them. See
  `docs/agent/workflows/shared-contracts.md`.
- `apps/api` — one model-facing field on the tool, its validation against the
  live menu, and the resolution that fills the response.
- `apps/web` — the assistant's product row renders the carried options, and the
  configuration sheet opens with them selected.
- The version fingerprint changes: the tool surface is part of it.
- Stored turns are unaffected: `response` is persisted as-is and not re-parsed
  on read, so an older turn simply carries no stated options.
