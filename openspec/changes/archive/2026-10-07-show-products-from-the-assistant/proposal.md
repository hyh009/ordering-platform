## Why

A guest asked for 蛋餅 at a store with twelve of them. The assistant called
`ask_choices`, which offers at most eight options, so it put six flavours in
`question` and the remaining six in a second entry of `additionalQuestions`.
The panel asks every question it is given, the guest answered both, and the two
answers travelled as one text message — which reads as an order for two egg
crepes. One guest, one dish, two in the cart.

`additionalQuestions` has since been removed, so a turn asks one question and
that failure cannot recur. What is left is the reason the model reached for a
second slot in the first place: **it had twelve things to show and a tool that
shows eight.** The regression case `我要蛋餅` still fails today, with the milder
symptom — the assistant offers eight of the twelve and hides four. Instruction
alone has not held it: the model has to count twelve, compare it to a cap stated
in prose, and choose a different kind of answer, and it does not.

The same shortage produced the other live defect this week. Asked for 鐵板麵 at a
store with two of them, the assistant put BOTH in the cart, with a reply that
read "我們有黑胡椒鐵板麵和蘑菇鐵板麵兩種喔！" — it had decided correctly that
there were two candidates, and then used the only tool that can put several
things in front of a guest. That tool was `propose_cart_operations`, and a
proposal changes the cart.

Both are the same gap: **the assistant can ask, propose, or refuse, but it cannot
SHOW.** Every request to see what a store offers — "有什麼蛋餅"、"推薦什麼"、
"鐵板麵有哪幾種" — has to be forced into a tool built for something else. A
choice list is for picking between a few interpretations; a proposal is for
changing the cart. Browsing is neither.

## What Changes

- A fourth answer: `show_products`, which puts a horizontal list of product
  cards in the transcript. It changes nothing, proposes nothing, and asks
  nothing. The model supplies only ids; every word, price, image and sold-out
  mark on a card is rendered from the menu data the page already holds.
- A card opens the product's existing configuration sheet, where the guest picks
  options and adds to the cart themselves — the same path the menu page uses.
  The assistant is out of the loop once the cards are on screen.
- The tool shows a whole category, or up to eight named products. A category is
  not capped: twelve cards in a scrolling row is the shape that fits twelve
  flavours, and the cap exists only for a set the model picks itself, where
  picking wrong or picking short is the risk.
- `ask_choices` drops from eight options to five. With product lists gone from
  it, what remains is choosing between a few readings of what the guest said,
  and five is more than that needs. A lower cap also makes "this does not fit"
  arrive sooner and more clearly.
- The regression case `我要蛋餅` changes from expecting a plain reply to
  expecting twelve cards, which is the answer the guest should have got.

## Impact

- `packages/shared` — a new response variant in the assistant contract, and the
  `ask_choices` option cap. See `docs/agent/workflows/shared-contracts.md`.
- `apps/api` — one tool definition, its model-facing schema, hydration,
  validation against the live menu, and the stored turn.
- `apps/web` — one new card-row component in the assistant panel, wired to the
  product sheet the menu page already opens.
- The version fingerprint changes: the answer shape is part of it. Stored turns
  are unaffected — `response` is persisted as-is and is not re-parsed on read.
