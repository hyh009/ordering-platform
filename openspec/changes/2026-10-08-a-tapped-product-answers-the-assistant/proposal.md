## Why

> Rewritten 2026-10-09. The first version of this change proposed carrying the
> guest's stated options onto the shown product cards. A replay run against the
> real model disproved its premise, and the implementation was reverted
> unmerged. What that version got wrong is recorded in `design.md`, because the
> wrong answer here is instructive.

A guest asked for 蛋餅加雞塊 at a store that sells twelve egg crepes and offers
nuggets as an add-on. The assistant showed the twelve as product cards and
replied `請問您想要哪一種蛋餅呢？`. The guest tapped a crepe, the configuration
sheet opened, and the nuggets were not there.

The model did nothing wrong. It knew the store sells nuggets, it knew which
crepe had to be settled first, and it knew twelve is more than a choice question
may offer. **It asked a question.** The information was never lost — the history
window carries 加雞塊, and the same request routed through `ask_choices`
proposes `+ 原味蛋餅 ×1 · 雞塊` correctly on the next turn.

The question simply has nowhere to be answered. A tap on a product card is not a
message, so no turn happens between the card and the cart. The assistant asked
something it could never hear the answer to.

So the hole is not "the add-on was not recorded". The hole is that
`show_products` serves two different intentions through one response:

- **「蛋餅有哪幾種」is browsing.** The tap opens the sheet directly, with no
  model call in the path. That is the response's virtue: instant, and the
  assistant proposes nothing. It must not get slower.
- **「我要蛋餅加雞塊」is a question.** The tap is an *answer*. It belongs back in
  the model's hands, which then proposes 原味蛋餅＋雞塊 for the guest to confirm
  once.

Which of the two a turn is, is a tool-choice judgement — the axis the model is
measurably stable on (`我要鐵板麵` already pins that it distinguishes asking from
proposing), and the thing it is already trying to do. The four previous attempts
at this defect all asked it to fill a field instead.

## What Changes

- A new tool lets the assistant ask the guest to pick one of the store's
  products, by product identifier. It proposes nothing and changes nothing, like
  `show_products`.
- Its response is a distinct type. The client renders the same product cards,
  and a tap on one **sends a turn** carrying the chosen product identifier,
  through the path that already exists for answering a choice question.
- The model answers that turn by proposing, and the proposal goes through the
  guest's confirmation exactly as every other proposal does.
- `show_products` is unchanged. Browsing keeps its client-only path to the
  sheet, with no model call and no confirmation step.
- A product question is not capped the way a choice question is at five
  options: cards scroll, so twelve kinds are asked about whole.

Not in scope:

- Carrying the stated option onto the cards as a badge. The model already knows
  which products offer it, so a badge informs only the guest — worth doing, but
  it is a separate optimisation and not what closes this hole. See design
  decision 9 for the smaller shape it should take if revisited.
- Raising `ask_choices`'s five-option cap, or letting it offer products.
- Making a stated option sticky across turns.

## Impact

- `packages/shared` — one new response variant, and one new field on the
  message request for the tapped product. See
  `docs/agent/workflows/shared-contracts.md`.
- `apps/api` — one new tool with its description, its validation against the
  live menu, and the rendering of a tapped product back into the next turn's
  context.
- `apps/web` — the assistant panel renders the new type's cards with answering
  behaviour instead of sheet-opening behaviour.
- The version fingerprint changes: the tool surface is part of it.
- Stored turns are unaffected: `response` is persisted as-is and not re-parsed
  on read, so no older turn can carry the new type.
- One extra model call and one confirmation step per answered product question.
  Paid only on this path, which is why the two paths stay separate.
