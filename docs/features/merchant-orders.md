# Merchant Orders (Management Platform)

## Purpose

The merchant-facing order management experience: store staff list and open
orders, advance each round through the kitchen, take payment, cancel rounds or
the whole order (with reasons), and complete the order. The underlying order
domain rules (cart/order/batch lifecycle, modes, group ordering) live in
[`ordering.md`](ordering.md) — this doc covers the management-platform read +
action slice and its UX behaviors. Item-level edits (modify a submitted item)
and merchant-side order creation are not built yet.

## Code Map

Backend:

- `apps/api/src/routes/v1/merchant/stores/[storeId]/orders.ts` — list/get +
  `PATCH .../cancel`, `/checkout`, `/complete`, `/batches/:batchId/status`,
  `/batches/:batchId/cancel`
- `apps/api/src/services/order.service.ts` — `listOrders`, `getOrder`,
  `cancelOrder`, `checkoutOrder`, `advanceBatchStatus`, `cancelBatch`,
  `completeOrder`
- `apps/api/src/models/order/model.ts` — status sets, `BATCH_STAGE_ORDER`,
  `canAdvanceBatch`, `rollupOrderStatus`, `canCompleteOrder`, `canCancelOrder`,
  `canCheckoutOrder`, `computeActiveOrderTotals`
- `apps/api/src/models/order/mapper.ts` — `toOrderDto`, `toOrderSummaryDto`
- `apps/api/src/services/guestOrdering/guestOrdering.sse.service.ts` —
  `emitOrderUpdated` (best-effort guest push on every mutation)
- `apps/api/tests/merchantOrders.test.ts`

Shared:

- `packages/shared/src/contracts/order.ts` — DTOs, status/reason enums, request
  schemas

Frontend:

- `apps/web/src/pages/merchant/orderList/*`, `apps/web/src/pages/merchant/orderDetail/*`
- `apps/web/src/features/merchant/orders/*` (detail store/actions/commands +
  `mutations/commands.ts`)
- `apps/web/src/services/order.service.ts`, `apps/web/src/models/order/*`
- `apps/web/src/services/utils/merchantApiError.ts` (`ORDER_LOCKED → conflict`)
- `apps/web/src/shared/hooks/useRelativeTime.ts`

## Authorization

- Reads (list, detail): `org_owner`, `org_admin`, `staff`.
- All mutations (cancel, checkout, complete, batch advance/cancel):
  `org_owner`, `org_admin` only. `staff` receives 403.

## Order List

- Paginated (`page`/`pageSize`); summary rows via `toOrderSummaryDto`.
- Filters: `status`, `paymentStatus`, `businessDate`, and `q` (search by display
  number or table number).

## Order Detail

- Renders order header (status, payment, type, table, date), participants,
  rounds (each batch with its items and subtotal), and totals.
- Participant names use `getOrderingParticipantDisplayName`: a custom
  `displayName`, else `Anonymous {animal} {id suffix}` derived from `avatarKey`
  and the participant id — distinct per guest, matching the storefront.

## Status Model

- Order status is derived from the batches by `rollupOrderStatus` — the
  **slowest active (non-cancelled) batch stage** — and persisted on every batch
  mutation so the list and the guest tracking page stay consistent. For
  `pay_later`, rollup returns `completed` only when payment is `paid` and every
  active batch is `ready`. `cancelled` and `pending_payment` are set explicitly,
  never by rollup.
- Batch lifecycle is forward-only: `pending_confirmation → preparing → ready`
  (`ready` is terminal prep), plus `cancelled`. There is no `served` stage and
  no skip-ahead.

## Actions

### Advance a round

`PATCH .../batches/:batchId/status` with the next stage. Forward-only
(`canAdvanceBatch`); stamps `confirmedAt`/`readyAt`; recomputes the order
rollup.

### Checkout (mark paid)

`PATCH .../checkout`. Allowed while `unpaid` and not `cancelled`
(`canCheckoutOrder`). Sets `paymentStatus = paid`, `paidAt`. Branches by mode:

- `pay_later`: locks guest add-ons immediately. If every active batch is already
  `ready`, also sets `status = completed` and `completedAt`; otherwise the order
  remains on its batch rollup and auto-completes when the remaining active
  batches become `ready`.
- `pay_first`: if `status === 'pending_payment'`, advance to
  `pending_confirmation`; do not auto-complete.

### Complete

`PATCH .../complete`. **`pay_first` only** — the UI hides Complete for
`pay_later`. Gated by `canCompleteOrder`: payment is `paid`, every batch ∈
{`ready`, `cancelled`}, with at least one not cancelled. Sets
`status = completed`, `completedAt`.

### Cancel a round / the whole order

`PATCH .../batches/:batchId/cancel` and `PATCH .../cancel`. Both take one or
more reasons (`no_show`, `out_of_stock`, `customer_request`, `other`) plus an
optional free-text note (at least one of reasons/note is required). See
[`ordering.md`](ordering.md) "Staff Edits And Cancellation" for the full
cancellation rules: totals zeroed on whole-order cancel, totals recomputed on
round cancel, a `ready` round stays cancellable, and cancelling every round
individually keeps the order open (only an explicit whole-order cancel is
terminal).

## Concurrency, live sync, and freshness

- **Optimistic lock, no retry.** Every mutation is a read-modify-write guarded
  by `expectedUpdatedAt` (CAS). A stale write returns `null` → the service
  throws `ConflictError` (`ORDER_LOCKED`, HTTP 409). Unlike the guest
  add-on flow, merchant mutations do **not** silently retry: the conflict is
  surfaced so the operator sees the change. See
  [`concurrency-control.md`](concurrency-control.md).
- **Conflict auto-refresh.** The detail page maps `ORDER_LOCKED → conflict`;
  the VM's shared mutation-failure handler reloads the order on a `conflict`
  before toasting, so a racing guest add-on appears before the operator retries.
- **Best-effort guest SSE.** After a successful mutation the service calls
  `emitOrderUpdated(order.cartId, …)` (only when a `cartId` exists). The guest
  order-tracking page is subscribed at the storefront layout, so merchant status
  changes appear live without a refresh. SSE failure never blocks the mutation.
- **Freshness indicator.** The merchant page does NOT subscribe to SSE, so the
  detail store tracks `lastLoadedAt` and the page shows "Updated X ago" + a
  Refresh button (relative time ticks via the self-contained `useRelativeTime`
  hook).

## Not yet built

- Item-level edits (modify quantity / options / remove a single item in a
  submitted batch).
- Merchant-side order creation (staff opening an order without a guest).
