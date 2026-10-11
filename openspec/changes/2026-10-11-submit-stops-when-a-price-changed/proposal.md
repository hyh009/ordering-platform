## Why

A cart line stores the price it had when it was added, and submission turns that
stored price into the order's price. Submission checks that a product or option
can still be bought (`findUnavailableItems`), but never checks what it now
costs. A merchant who changes a price while a guest has the item in a cart
therefore sells it to that guest at the old price, and nobody is told.

The guest is not harmed by this — they pay what they saw — but the merchant has
no way to know it happened, and the cart shows names that are just as stale (a
translation added after the item was carted never appears until the line is
edited).

## What Changes

- Submitting a cart compares each submitted line's stored unit price with the
  price the current menu gives the same selection. If any line differs, the
  submission is refused with a new `PRICE_CHANGED` failure that lists the lines
  affected, each with its old and new price. No order is created or extended.
- The refusal also brings the cart up to date: the affected lines carry the
  current price and the cart totals are recomputed, so the guest sees the new
  numbers and can confirm by submitting again. Nothing is repriced silently.
- The storefront shows a message that prices changed and refreshes the cart, so
  the guest is looking at the new prices when they decide.
- On every successful submission, the localized names carried by the submitted
  lines are taken from the current menu, so the order records names as they
  were when it was placed. This does not block or change any price.
- Lines already on an order from an earlier round are never repriced.

## Capabilities

### New Capabilities

- `guest-order-submission`: what a guest submission checks before it becomes an
  order — availability, price, and the names the order records.

### Modified Capabilities

<!-- None: no main spec covers guest cart submission today. -->

## Impact

- `packages/shared`: a new error code, and the contract of the refusal's detail
  payload.
- `apps/api`: `submitCart` and its availability check in
  `guestOrdering.data.service.ts`; the cart route's OpenAPI description.
- `apps/web`: storefront error mapping, failure presentation, and the cart
  page's reaction to the new failure.
- No schema migration. Existing carts are repriced lazily, on their next
  submission.
