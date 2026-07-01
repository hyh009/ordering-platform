# Order History

## Purpose

Order history lets a storefront guest reopen recent orders from the same browser
without replacing the active guest session. It is a browser-local convenience,
not account-backed history and not a security boundary.

## Code Map

Frontend:

- `apps/web/src/pages/storeFront/orderHistory/`
- `apps/web/src/pages/storeFront/order/orderTrackingPage.commands.ts`
- `apps/web/src/features/storeFront/orderHistory/`
- `apps/web/src/features/storeFront/cartWorkflow/commands.ts`
- `apps/web/src/features/storeFront/sessionStream/commands.ts`
- `apps/web/src/services/storeFrontOrder.service.ts`

Backend:

- `apps/api/src/routes/v1/public/guest/...`
- `apps/api/src/services/guestOrdering.service.ts`

## Frontend

- Landing shows **Recent orders** only when this browser has non-expired
  entries for the route store.
- `/s/:storeId/orders` lists recent orders for the current store.
- `/s/:storeId/orders/:orderId` can show either the active-session order or a
  read-only history order.
- Opening a history order uses the token stored on that history entry. It must
  not restore, replace, or clear the active guest session.
- The order history page loads the current order snapshot from the API before
  rendering list items; localStorage does not store full order snapshots.

Current write sources:

- Successful cart submit records the submitted order with the current scoped
  guest token.
- Joining a cart/order records the order when the join response includes an
  order.
- SSE `order_updated` records the pushed order with the current scoped guest
  token.
- Active order tracking records the order after the page successfully loads it
  with the current active guest session. This is a backfill for participants who
  observe their order outside the submit/join response path.

Live update constraint:

- SSE `order_updated` updates the active order store for the scoped guest token.
- Do not clear the guest session from an SSE `order_updated` only because
  `order.canAddOn` is false. Clear the draft cart if the UI should stop showing
  the current round, then route the guest to order tracking. The guest token
  remains the active identity for tracking and possible add-on flows until the
  session actually ends.

## API

- History list loading calls the guest order read API once per stored entry,
  using that entry's guest token.
- If the API returns `session-expired` or `not-found`, remove that history entry.
- Transient failures keep the entry and surface a retryable page error when no
  orders can be shown.

## Data

Order history entries are stored in browser localStorage under a store-scoped
key:

```txt
ordering-platform.storeFrontOrderHistory:<storeId>
```

Entry shape:

```ts
type StoreFrontOrderHistoryEntry = {
  storeId: string;
  orderId: string;
  guestToken: string;
  createdAt: string;
  expiresAt: string;
};
```

Rules:

- Entries are partitioned by `storeId`.
- Entries expire after 24 hours.
- Expired or malformed entries are pruned lazily when history is read.
- Re-recording the same `orderId` deduplicates the entry and moves the latest
  record to the front.
- Clearing browser storage or using a different browser/device loses the list.

## Session And Cart Lifecycle

Order history and the active guest session are separate:

- Clearing a draft cart does not clear the active guest session.
- Submitting a cart clears the cart state for that round, stores the order, and
  keeps the guest session so the participant can track the active order.
- `order.canAddOn = false` means no more add-on items are allowed; it does not
  by itself end the guest session.
- Clear the guest session when the token/session is unusable or the order is
  finished (`completed` or `cancelled`), when the guest leaves an unsubmitted
  cart, or when session restore reports the session has ended/expired.

## Notes

- Recent orders may include unfinished and finished orders.
- Landing uses **Resume ordering** only for the store's active guest session; it
  does not infer resumability from order history.
- A history order is read-only in the UI. Add-on is offered only for the
  participant's active session order.
