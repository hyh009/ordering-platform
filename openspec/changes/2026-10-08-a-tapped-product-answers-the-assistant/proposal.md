## Why

> Rewritten twice. The first version carried the guest's stated options onto the
> shown cards; a replay disproved its premise and the code was reverted
> unmerged. The second added a second tool for asking. Both are recorded in
> `design.md`, because the wrong answers here are instructive.

A guest asked for 蛋餅加雞塊 at a store that sells twelve egg crepes and offers
nuggets as an add-on. The assistant showed the twelve as product cards and
replied `請問您想要哪一種蛋餅呢？`. The guest tapped a crepe, the configuration
sheet opened, and the nuggets were not there.

The model did nothing wrong. It knew the store sells nuggets, it knew which
crepe had to be settled first, and it knew twelve is more than a choice question
may offer. **It asked a question.** The information was never lost — the history
window carries 加雞塊, and the same request routed through `ask_choices`
proposes `+ 原味蛋餅 ×1 · 雞塊` correctly on the next turn.

The question simply has nowhere to be answered, and the reason is in the
runtime. The model does call `show_products` as a tool — but it is bound as what
the code calls an output-channel tool, with `async () => ''` for a body, and
`planningMiddleware` discards the call and returns the reply as a plain message
so the loop ends:

```
// Returned WITHOUT tool calls, so the agent loop ends here. `ask_choices`
// and `report_unanswerable` have nothing to execute, and letting them
// reach a tool node would feed a result back and call the model again.
```

Feeding a result back and calling the model again is exactly what an answered
question needs. `propose_cart_operations` already works that way: its call is
rewritten to a hydrated one rather than discarded, the human-in-the-loop
middleware interrupts on it, and the guest's decision resumes the run. Showing
products is the one place the assistant asks something and then throws away the
channel the answer would come back on.

## What Changes

- `show_products`'s tool call stops being discarded. It is rewritten to a
  hydrated call the way a proposal's already is, and joins
  `propose_cart_operations` in the middleware's `interruptOn`. Listing it in
  `interruptOn` alone would do nothing: the middleware interrupts on a pending
  tool call, and today there is none left to interrupt.
- Tapping a shown product **resumes the paused run** with that product as the
  tool result. The model continues and proposes, which interrupts again, and the
  guest confirms once.
- Nothing about the model's surface changes: no new tool, no new response type,
  no new field, and no judgement about whether a turn is browsing or asking.
- A shown set gains a stored snapshot and a decision record, the third of a
  shape the conversation already has for a choice question and for a proposal.
  Without it a tap cannot be resolved against the set that was shown, and
  "tapped", "typed instead" and "lapsed" cannot be told apart on reload.
- The assistant panel's cards no longer open the configuration sheet. The
  proposal card becomes the single place an assistant-originated item is
  configured and confirmed. The menu grid keeps its sheet, unchanged.

Not in scope:

- A second tool for asking, which the previous version of this change proposed.
- Raising `ask_choices`'s five-option cap, or letting it offer products.
- Carrying the stated option onto the cards as a badge. The model already reads
  which products offer it, so a badge informs only the guest — worth doing, but
  separate, and smaller than the first version assumed. See design decision 11.
- Making a stated option sticky across turns.

## Impact

- `apps/api` — `show_products` becomes a hydrated tool call; the middleware
  interrupts on it; the resume path accepts a picked product; the turn record
  gains a shown-set snapshot with its own decision.
- `packages/shared` — the resume request for a picked product, and the shown-set
  response gains the identifier a tap answers against. See
  `docs/agent/workflows/shared-contracts.md`.
- `apps/web` — the assistant panel's cards resume the run instead of opening the
  sheet, and an unanswerable shown set says so.
- The version fingerprint changes: whether a tool interrupts is part of the
  answer shape.
- Stored turns are unaffected: `response` is persisted as-is and not re-parsed
  on read, so an older `products` turn simply carries no shown-set snapshot and
  is not answerable.
- One extra model call and one confirmation step per tapped product, including
  for a guest who was only browsing. Accepted in design decision 8.
