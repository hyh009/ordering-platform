Three slices in dependency order: shared contract, api, web. Each ends with its
own verification per `docs/agent/workflows/verification.md`.

## 1. Shared contract

- [x] 1.1 Add `aiOrderingProductsResponseSchema` to
  `packages/shared/src/contracts/aiOrdering.ts`: `type: 'products'`, `reply`,
  and the resolved set the client renders — `productIds` (1..n) plus an optional
  `categoryId` naming where they came from. The client holds the menu, so the
  response carries ids and not product data; state that in the schema's comment
  so a later field is not added out of convenience
- [x] 1.2 Add the variant to the response union and to the response-type enum
  used by the stored turn and the merchant's listing filter
- [x] 1.3 Lower `choices.options` from `.max(8)` to `.max(5)`, with a comment
  saying what the cap is FOR — product lists have their own response now, and a
  list cut short to fit is the defect this bound exists to force out
- [x] 1.4 Verification: `pnpm --filter @repo/shared run build`

## 2. API

- [x] 2.1 Add `show_products` to `aiOrderingToolDefinitions` (`tools.ts`): what
  it is for, that it shows and never changes the cart, that a category shows
  whole while an explicit list is capped at eight, and when to prefer it over
  `ask_choices` and over `propose_cart_operations`. Keep the boundary rules in
  this description and not in `coreInstructions.ts` — one rule, one layer
- [x] 2.2 Add its model-facing schema to `aiOrderingModelArgumentSchemas`
  (`modelResponse.ts`): `reply`, optional `categoryId`, optional `productIds`
  (max 8), every field described. Verify the existing test that walks the
  generated JSON Schema still passes — it fails on any undescribed property
- [x] 2.3 Lower the `ask_choices` option cap to five in the model-facing schema,
  and say in the `options` description that a list cut short to fit is a reason
  to show products instead
- [x] 2.4 Hydrate a `products` response in `hydrateAiOrderingResponse`: resolve a
  category to its product ids in menu order; pass an explicit list through in
  the order given, which is the model's own ordering and the only ranking it can
  express
- [x] 2.5 Validate against the turn's menu: every product id exists; a category
  id exists and is non-empty; exactly one of the two is supplied; at most eight
  explicit ids. Reject with a detail the model can act on, reusing the repair
  path a rejected proposal takes. Verify with unit tests per failure, including
  both-supplied and neither-supplied
- [x] 2.6 Store the turn: `response.type` is already queryable, so confirm the
  new type needs no second field and does not disturb the merchant's
  unanswered-question listing
- [x] 2.7 Update the `我要蛋餅` regression case to expect a shown set of twelve
  rather than a plain reply, and add a case for a two-product name stem
  (`我要鐵板麵`) that accepts either a shown set or a question, since both are
  honest answers at two candidates
- [x] 2.8 Verification: `pnpm --filter api exec tsc --noEmit`, `pnpm --filter api
  test`, and `pnpm --filter api replay -- --versions v1-2026-09-30 --suite
  regression`. Record the new fingerprint: the answer shape is part of it, so
  this run starts a new comparison baseline

## 3. Web

- [x] 3.1 Deserialize the variant in `models/aiOrdering/model.ts`, field by
  field like the others, so a server-side addition cannot reach the panel
  unnoticed
- [x] 3.2 Add a `products` entry to `AssistantEntryView` in
  `assistantPanelView.ts`, resolving ids against the menu the page already
  holds. An id with no product in that menu is dropped rather than rendered
  empty; if none resolve, the entry degrades to its reply alone
- [x] 3.3 Add `AssistantProductRow`: a horizontally scrolling row of the
  existing `ProductCard`, in the transcript beneath the reply. Not in the dock —
  it is not waiting on the guest (design decision 6)
- [x] 3.4 Wire a card tap to the product sheet the menu page already opens
  (`setOpenProduct` on the menu page VM), so adding goes through the path that
  already validates modifiers and sold-out state. The panel owns no add of its
  own
- [x] 3.5 Keep the flow intact: the view calls the page VM hook, never a store
  or service. Any new i18n key uses an English default string
- [x] 3.6 Verification: `pnpm --filter web exec tsc --noEmit -p
  tsconfig.app.json`, `pnpm --filter web test`, and
  `docs/agent/frontend/architecture-validation.md`

## 4. Close out

- [ ] 4.1 Check the panel by hand against a store with a twelve-product
  category: ask for the dish, read the row, open a card, add it, and confirm the
  assistant proposed nothing
- [ ] 4.2 Update `docs/features` if the assistant has a feature doc, per
  `docs/agent/workflows/feature-docs.md`
