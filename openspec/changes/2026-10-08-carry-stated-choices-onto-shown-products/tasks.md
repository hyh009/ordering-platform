Three slices in dependency order: shared contract, api, web. Each ends with its
own verification per `docs/agent/workflows/verification.md`.

## 1. Shared contract

- [ ] 1.1 Extend `aiOrderingProductsResponseSchema` in
  `packages/shared/src/contracts/aiOrdering.ts` with the resolved stated
  options: each carries its `modifierId`, `optionId`, its localized `label` and
  its `priceAdjustment`, all written by the server from menu data. State in the
  comment that the model supplies ids and never these
- [ ] 1.2 Add which products carry which option, as a flat list of
  `{ productId, optionId }` rather than a map, so the client groups it and no
  key has to be parsed
- [ ] 1.3 Add `AI_ORDERING_MAX_STATED_OPTIONS = 3`, with a comment saying what
  the cap is for: a guest stating four conditions while browsing is asking for a
  proposal, not a row of cards
- [ ] 1.4 Verification: `pnpm --filter @repo/shared run build`

## 2. API

- [ ] 2.1 Add the stated-options field to the `products` argument schema in
  `modelResponse.ts`: option ids only, capped, described as "the options the
  guest has already asked for". Say in the description that it is options alone
  and never option-plus-product, because the guest named the add-on before any
  product was chosen
- [ ] 2.2 Say the same in one line of the `show_products` description in
  `tools.ts`, and nowhere else. Keep it short: a long addition to one tool's
  description has twice measurably changed behaviour on unrelated cases
- [ ] 2.3 Resolve the stated options during hydration: look up each option in
  the menu, take its owning modifier, and record a carry for every shown product
  whose `modifierIds` contains that modifier. Identifier equality only — no name
  comparison, no fallback (design decision 2)
- [ ] 2.4 Write the resolved label and price adjustment from the menu, localized
  the way the choice groups already are. The guest reads these, which is why
  they are not the model's to write
- [ ] 2.5 Validate in `validation.ts`: a stated option id the menu does not
  contain is a rejection with its own code, merged into the same repair path the
  other shown-set rejections use. An option that resolves but no shown product
  offers is NOT a rejection — it is an answer, reported in the response
- [ ] 2.6 Add the stated option ids to `collectAiOrderingContextIds` and to the
  decoder in `shortCodes.ts`, so the model writes and reads short codes for them
  like every other id
- [ ] 2.7 Print the carried options on the replay outcome line, so a regression
  case can be read at a glance
- [ ] 2.8 Regression cases against a menu whose crepes share one add-on
  modifier: `我要蛋餅加雞塊` shows the crepes AND states the nugget option;
  `我要蛋餅` states none. Pin that nothing is proposed in either
- [ ] 2.9 Verification: `pnpm --filter api test`, typecheck, and a replay run of
  the two new cases once the daily model quota allows

## 3. Web

- [ ] 3.1 Carry the resolved stated options and the carries through
  `src/models/aiOrdering`, converted like every other DTO — no raw DTO past the
  model layer
- [ ] 3.2 Extend the `products` entry in `assistantPanelView.ts` with, per shown
  product, the options it carries; drop a carry whose product was dropped
- [ ] 3.3 Render the badge in `AssistantProductRow`, on the wrapper around each
  card and not inside `ProductCard`: name and price adjustment, e.g. `+雞塊 $20`.
  A product that carries nothing is shown unmarked (design decision 4)
- [ ] 3.4 Render a line under the reply when a stated option is carried by no
  shown product, naming it. This is the whole reason the field exists
- [ ] 3.5 Open `ProductConfigSheet` with the carried options selected: a
  preselection on an ADD, distinct from the `editing` initial a cart item
  opens with. The guest can deselect, and nothing reaches the cart until they
  confirm
- [ ] 3.6 Tests: the view entry groups carries per product and drops orphans;
  the row marks only the products that carry; the sheet opens with the option
  selected and adds without it once deselected
- [ ] 3.7 Verification: `pnpm --filter web test`, typecheck, lint, and the
  frontend architecture validation guide

## 4. By hand

- [ ] 4.1 Against a store with a twelve-product category and a shared add-on
  modifier: ask for the dish with the add-on, read the row, confirm the marks,
  open a marked card, confirm the option is ticked, add it, and confirm the
  assistant proposed nothing
- [ ] 4.2 Ask for the dish with an add-on no product offers, and confirm the
  guest is told
