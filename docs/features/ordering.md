# Ordering

## Purpose

Ordering lets dine-in and takeaway guests build a cart, submit order batches,
and let staff confirm payment and kitchen progress. Dine-in pay-later guests can
share a join code for group ordering and add-ons before payment.

MVP does not integrate online payment. Staff manually confirms whether payment
has been collected.

## Code Map

Backend:

- `apps/api/src/models/store/model.ts`
- `apps/api/src/models/cart/model.ts`
- `apps/api/src/models/order/model.ts`
- `apps/api/src/models/counter/model.ts`
- `apps/api/tests/orderingRuntime.mongo.test.ts`

Schema:

- `docs/schema/mongo.md`

## Ordering Modes

Cart, Order, and Counter records are store-scoped. Each stores both `storeId`
and `organizationId`; services validate that both refer to the same ownership
chain.

`Store.operation.orderModes` controls which order types are enabled and how they
are checked out:

- `dine_in` supports `pay_later` and may support `pay_first`.
- `takeaway` is `pay_first` for MVP.
- `pay_first` means staff must confirm payment before the order enters kitchen
  preparation.
- `pay_later` means the order can enter preparation before payment; payment is
  collected when staff settles the bill.

`pending_payment` is reserved for future online payment. Without payment
integration, submitted orders that staff can act on use `pending_confirmation`.

## Cart Lifecycle

Cart statuses:

- `active`: guests can add items and participants.
- `checked_out`: the cart has been submitted into an order.
- `abandoned`: the cart expired or was abandoned before order creation.

Cart behavior:

- active carts may have a `joinCode` for group ordering.
- guests join by code and are stored as embedded participant snapshots.
- cart items keep `addedByParticipantId` and `participantDisplayName` so the UI
  can show who ordered each item.
- checked-out carts keep `orderId`.
- for dine-in `pay_later`, the checked-out cart's `joinCode` or order session
  can still route guests to the order for add-ons until payment is confirmed.
- active carts should expire into `abandoned` after an inactivity window.
- abandoned carts may be physically cleaned up later; do not hard-delete active
  carts as the primary lifecycle behavior.

## Dine-In Pay Later

Create cart:

- `Cart.status = active`
- `Cart.orderType = dine_in`
- `Cart.checkoutMode = pay_later`
- `Cart.tableNumber = table number | undefined`
- `Cart.joinCode = generated code`
- `Cart.participants = initial participant`
- `Cart.items = []`

Add participants and items:

- append to `Cart.participants`
- append to `Cart.items`
- recalculate `subtotal`, `serviceFeeAmount`, and `totalAmount`

Submit first batch:

- `Cart.status = checked_out`
- create `Order`
- `Order.cartId = Cart.id`
- `Order.orderType = dine_in`
- `Order.checkoutMode = pay_later`
- `Order.status = pending_confirmation`
- `Order.paymentStatus = unpaid`
- `Order.tableNumber = Cart.tableNumber`
- `Order.participants = Cart.participants`
- `Order.items = Cart.items`
- create `Order.batches[0]` with `status = pending_confirmation`
- reserve `businessDate`, `dailySequence`, and `displayNumber`
- `Cart.orderId = Order.id`

Staff confirms a batch:

- batch `status = preparing`
- batch `confirmedAt = now`
- order `status = preparing` unless another submitted batch is still pending

Kitchen marks a batch ready:

- batch `status = ready`
- batch `readyAt = now`
- order `status = ready` when all non-cancelled batches are ready

Staff marks the order served:

- use `served` after food has been delivered to the table or the takeaway order
  has been picked up
- `Order.status = served`
- `Order.servedAt = now`

Guest adds more before payment:

- allowed only when `orderType = dine_in`, `checkoutMode = pay_later`,
  `paymentStatus = unpaid`, and `Order.status` is not `completed` or
  `cancelled`
- this includes already `ready` or `served` dine-in orders that have not been
  paid or completed yet
- payment confirmation, order completion, and order cancellation all stop guest
  add-ons
- guests continue from the original `joinCode` or order session after the cart
  becomes `checked_out`
- append a new `Order.batches[]` entry with `status = pending_confirmation`
- append new items to `Order.items`
- recalculate order totals
- `Order.paymentStatus` remains `unpaid`
- each added batch requires staff confirmation

Staff takes payment:

- staff can take payment while the order is still `pending_confirmation`,
  `preparing`, `ready`, or `served`, as long as `paymentStatus = unpaid` and
  the order is not `completed` or `cancelled`
- `Order.paymentStatus = paid`
- `Order.paidAt = now`
- the join code becomes invalid
- no more guest add-ons are allowed
- payment does not complete the order; existing batches continue through
  confirmation, preparation, ready, and served states

Operational completion:

- staff marks the order complete after the order is served, payment is handled,
  and there are no pending restaurant actions
- `Order.status = completed`
- `Order.completedAt = now`

## Pay First Orders

Pay-first applies to takeaway and may also apply to dine-in. Dine-in pay-first
can use a table number or rely only on the order display number for pickup.

Create and submit cart:

- create an active cart with `checkoutMode = pay_first`
- on guest submission, set `Cart.status = checked_out`
- create `Order`
- `Order.status = pending_confirmation`
- `Order.paymentStatus = unpaid`
- create the first batch with `status = pending_confirmation`
- reserve `businessDate`, `dailySequence`, and `displayNumber`

Staff confirms payment:

- `Order.paymentStatus = paid`
- `Order.paidAt = now`
- first batch `status = preparing`
- first batch `confirmedAt = now`
- `Order.status = preparing`

Kitchen and pickup:

- when food is ready, batch `status = ready` and `Order.status = ready`
- when the guest takes the order, `Order.status = served` and
  `Order.servedAt = now`
- staff marks the order complete after pickup has no remaining operational work
- `Order.status = completed`
- set `Order.completedAt = now`

Pay-first add-ons are separate orders for MVP for both takeaway and dine-in
pay-first. Do not mutate the previous pay-first order for add-ons.
They do not need to wait for the previous pay-first order to reach
`completed`.

## Staff Edits And Cancellation

Guests cannot modify submitted batches.

Staff can:

- update submitted items
- cancel individual submitted items
- cancel a batch
- cancel the whole order
- update or cancel submitted work even after kitchen progress changes, because
  restaurants may need to handle sold-out items, mistakes, waste, or guest
  requests

Cancellation behavior:

- cancelled orders keep their daily number; daily numbers are not reused.
- unpaid cancellation keeps `paymentStatus = unpaid`.
- paid cancellation can use `paymentStatus = voided` or `refunded`, depending
  on whether money was only voided or actually refunded.
- cancelled orders set `Order.status = cancelled` and `Order.cancelledAt = now`.
- submitted batches can be cancelled by staff, including ready batches when the
  restaurant needs an operational exception.
- cancelled batches set `OrderBatch.status = cancelled` and
  `OrderBatch.cancelledAt = now`.
- if a ready batch or paid order is cancelled, staff must also adjust order
  totals and `paymentStatus` with `voided` or `refunded` as needed.

## Notes

- `Order.status` is the order-level operational summary.
- `ready` means food is prepared and waiting for delivery or pickup.
- `served` means food has been delivered to the table or picked up.
- `completed` means the order is served, payment is handled, and no restaurant
  action remains.
- `OrderBatch.status` is the source of truth for individual submitted kitchen
  batches.
- Staff views should prioritize `pending_confirmation` batches.
- Customer views can show the order-level summary plus each user's item list.
