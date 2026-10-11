Three slices in dependency order: shared contract, api, storefront web. Each
ends with its own verification per `docs/agent/workflows/verification.md`.

## 1. Shared contract

- [ ] 1.1 Add `PRICE_CHANGED` to `packages/shared/src/contracts/errorCode.ts`
  beside `PRODUCT_SOLD_OUT`, following `docs/agent/workflows/shared-contracts.md`
- [ ] 1.2 Export the `changedItems` detail shape (item id, product id, previous
  and current unit price) from the shared contracts so the web does not
  hand-write it
- [ ] 1.3 Verification: `pnpm --filter @repo/shared run build`, then typecheck
  `apps/api` and `apps/web` against it

## 2. API — submission

- [ ] 2.1 Widen `findUnavailableItems` into one reconcile pass that returns
  unavailable lines, price changes (current unit price = product price plus the
  current adjustment of each selected option), and lines with current localized
  names applied. Availability is evaluated first and short-circuits price (spec:
  availability before price). Unit test the pure comparison: unchanged, product
  price up, product price down, option adjustment changed, and sold-out plus
  changed
- [ ] 2.2 On a price difference, throw an internal error carrying the corrected
  lines; catch it outside `withTransaction`, apply the new prices to the cart by
  line id through `updateCartWithRetry`, recompute totals with `computeTotals`,
  then throw `ConflictError` with `PRICE_CHANGED` and `changedItems`. Skip lines
  that no longer exist. API test: after the refusal, `GET` cart returns the new
  line prices and totals, and no order exists
- [ ] 2.3 API test: submitting again after 2.2 with no further change creates
  the order at the new prices (spec: guest confirms by submitting again)
- [ ] 2.4 Apply the reconciled names to the submitted lines on success in both
  round 1 and add-on rounds. API test: an English name added after carting
  appears on the order line; a rename with no price change submits successfully
- [ ] 2.5 API test: an add-on round after a price change leaves first-round
  lines at their original price and compares only the new round's lines
- [ ] 2.6 Document `PRICE_CHANGED` and its detail on the submit route in
  `apps/api/src/routes/v1/public/guest/cart.ts`, beside the existing
  `PRODUCT_SOLD_OUT` example, per `docs/agent/backend/swagger.md`
- [ ] 2.7 Verification: `pnpm --filter api test` for the touched files,
  typecheck, lint

## 3. Storefront web

- [ ] 3.1 Map `PRICE_CHANGED` to a new `price-changed` reason in
  `apps/web/src/services/utils/storeFrontApiError.ts` (both tables, English
  default string, new i18n key), and add its entry to
  `STOREFRONT_FAILURE_PRESENTATION` as a toast on the action axis. The
  exhaustive records make a missing entry a type error
- [ ] 3.2 Extend `storeFrontApiError.test.ts` to cover the code, reason and
  message
- [ ] 3.3 Read how the cart page behaves after a failed submit to settle the
  open question in `design.md`. If it does not already reload the cart, have
  the `submitCart` command re-read the cart through the existing cart service
  and hydrate the store through the existing feature action on this reason.
  Command test: on `PRICE_CHANGED` the cart store holds the repriced lines
- [ ] 3.4 Verification: the affected `vitest` files, `tsc`, lint, and
  `docs/agent/frontend/architecture-validation.md`

## 4. Hand-check

- [ ] 4.1 With the dev servers started by the user, cart an item, change its
  price in the merchant app, submit, and confirm the toast and the new price in
  the cart; submit again and confirm the order total. Not run by the agent
  unless the user starts the servers
