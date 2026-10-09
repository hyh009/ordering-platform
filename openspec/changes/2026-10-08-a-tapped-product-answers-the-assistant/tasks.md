Four slices in dependency order: shared contract, api, web, by hand. Each ends
with its own verification per `docs/agent/workflows/verification.md`.

Nothing from the reverted first version is reused. `statedOptions`,
`optionCarries`, `AI_ORDERING_MAX_STATED_OPTIONS` and the sheet preselection are
gone on purpose — do not reintroduce them as part of this change.

## 1. Shared contract

- [ ] 1.1 Add `aiOrderingProductQuestionResponseSchema` to
  `packages/shared/src/contracts/aiOrdering.ts`: `type: 'productQuestion'`,
  `reply`, a question, and `productIds`. Bound it the way the `products`
  variant is bound, NOT by `AI_ORDERING_MAX_CHOICE_OPTIONS` (design decision 7),
  and say why in the comment
- [ ] 1.2 Add it to `aiOrderingResponseSchema`'s union and export its type
- [ ] 1.3 Add `selectedProductId` to `sendAiOrderingMessageSchema`, its own
  field beside `selectedOptionId`, with a comment saying the two are not
  interchangeable because they validate against different parts of the menu
  (design decision 4)
- [ ] 1.4 Verification: `pnpm --filter @repo/shared run build`

## 2. API

- [ ] 2.1 Add the `ask_which_product` tool in `tools.ts` with its argument
  schema in `modelResponse.ts`: product ids and a question. Keep the
  description short — a long addition to one tool's description has twice
  measurably changed behaviour on unrelated cases
- [ ] 2.2 State the asking-versus-showing distinction in exactly ONE place.
  `show_products` is not edited (design decision 2), so the distinction belongs
  in the new tool's description: use this when which one they want has to be
  settled before anything can be proposed
- [ ] 2.3 Validate the product ids against the live menu in `validation.ts`,
  reusing the shown-set rejection path. A sold-out product is left out, as in
  the shown set
- [ ] 2.4 Add the product ids to `collectAiOrderingContextIds` and the decoder
  in `shortCodes.ts`, so they are short-coded like every other id
- [ ] 2.5 Render a picked product into the next turn's context in `context.ts`,
  the way an answered choice already is: which question it answers, and the
  product by code and name. A typed answer renders as "they did not pick any of
  the products and typed this instead", mirroring the existing choice wording
- [ ] 2.6 Accept `selectedProductId` through the turn service, validating it
  belongs to the question identified by `responseToPromptId`. A pick naming a
  product that question never presented is rejected
- [ ] 2.7 Print the question and its products on the replay outcome line so a
  regression case is readable at a glance
- [ ] 2.8 Regression case: `我要蛋餅加雞塊` against the twelve-crepe fixture
  expects a product question presenting all twelve, nothing proposed. Pin that
  `蛋餅有哪幾種` still answers with `products` and no question — the two must not
  collapse into one
- [ ] 2.9 Regression case with a `proposalLog`/`history` override standing in
  for the pick: the follow-up turn proposes the chosen crepe WITH the nugget,
  from history alone and with no option field (design decision 5)
- [ ] 2.10 Verification: `pnpm --filter api test`, typecheck, lint, and a replay
  run of the new cases plus the full `--suite regression` once the daily model
  quota allows. Record the before/after counts; the standing baseline is 19 of
  20 at fingerprint `bc0d9296179a`

## 3. Web

- [ ] 3.1 Carry the new response through `src/models/aiOrdering` like every
  other variant — no raw DTO past the model layer
- [ ] 3.2 Add a `productQuestion` entry to `assistantPanelView.ts` beside the
  `products` entry: same resolution of ids to products, plus the question and
  whether it is still answerable
- [ ] 3.3 Render it with the existing card row, but with picking behaviour
  instead of sheet-opening behaviour. Factor the row so both callers share the
  scrolling and the cards and differ only in what a tap does — do not copy it
- [ ] 3.4 Wire the pick through the page VM's existing send path, carrying
  `responseToPromptId` and `selectedProductId`, so it is one turn and one
  pending state like a typed message
- [ ] 3.5 Show the picked product in the transcript as the guest's turn
- [ ] 3.6 Make an unanswerable question's cards unpickable with a stated reason:
  store shut, sold out, session ended, or superseded by a later turn (design
  decision 10)
- [ ] 3.7 Keep the composer usable while a product question is open, so a typed
  answer still works (design decision 11), and pin it in a test
- [ ] 3.8 Tests: the view entry resolves and drops products the same way the
  `products` entry does; a tap sends one turn with the product id and the prompt
  id; a browse tap still opens the sheet and sends nothing; a superseded
  question is unpickable
- [ ] 3.9 Verification: `pnpm --filter web test`, typecheck, lint, and the
  frontend architecture validation guide

## 4. By hand

- [ ] 4.1 Against a store with a twelve-product category and a shared add-on
  modifier: ask for the dish with the add-on, confirm a question is asked with
  all twelve presented, tap one, confirm a proposal arrives carrying the add-on,
  confirm it, and confirm the cart line matches
- [ ] 4.2 Ask `蛋餅有哪幾種` on the same store and confirm the old path is
  unchanged: tap opens the sheet, no turn is sent, nothing is proposed, and it
  is noticeably faster than 4.1
- [ ] 4.3 Tap a product whose kind does not offer the stated add-on, and confirm
  the assistant says so rather than proposing something the product cannot carry
- [ ] 4.4 Answer a product question by typing, and confirm it is understood
