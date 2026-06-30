# Ordering

## Purpose

Ordering lets dine-in and takeaway guests build a cart, submit order batches,
and let staff confirm payment and kitchen progress. Dine-in guests can share a
Join Code before checkout; dine-in pay-later guests can continue group ordering
and add-ons after checkout until the order closes.

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

## Group Ordering

- Every dine-in Cart has a Join Code. Takeaway does not support group ordering.
- Before checkout, the Join Code is usable for both dine-in `pay_first` and
  `pay_later`.
- After checkout, a dine-in `pay_first` Join Code is unusable.
- After checkout, a dine-in `pay_later` Join Code remains usable while the Order
  is unpaid, not `completed` or `cancelled`, and its optional
  `orderingClosesAt` has not passed.
- Joining and pay-later add-ons follow the same post-checkout availability
  rules.

Participants use a generated `participantId` as their authoritative identity.
Each participant snapshot also keeps an `avatarKey`, an optional custom
`displayName`, and the UI derives an unnamed participant's short discriminator
from the final five characters of `participantId`, such as
`Anonymous Cat A3F2B`. Avatar and display data are presentation snapshots and
are not uniqueness or authorization constraints.

## Cart Lifecycle

Cart statuses:

- `active`: guests can add items and participants.
- `checked_out`: the cart has been submitted into an order.
- `abandoned`: the cart expired or was abandoned before order creation.

Cart behavior:

- active dine-in carts have a `joinCode` for group ordering.
- guests join by code and are stored as embedded participant snapshots.
- cart items preserve enough participant display data to render the custom or
  anonymous identity that added them.
- checked-out carts keep `orderId`.
- every active Cart has a fixed `expiresAt = createdAt + 12 hours`.
- when `Store.operation.guestOrderingDurationMinutes` is configured, Cart
  creation snapshots `orderingClosesAt` by adding that duration to `createdAt`;
  otherwise `orderingClosesAt` is absent.
- joining participants and Cart activity do not extend either timestamp.
- for dine-in `pay_later`, the Join Code or order session can still route guests
  to the Order for joining and add-ons while its post-checkout group-ordering
  rules remain satisfied.
- an active Cart is operationally unusable once `expiresAt` or its optional
  `orderingClosesAt` passes.
- backend deadline checks are authoritative for every Cart API, including
  session restore, reads, joins, mutations, leave, and submission; frontend
  deadline checks are presentation only.
- each service operation captures one server-side request time for deadline
  comparison. A request received before the deadline may finish afterward,
  including through optimistic concurrency retries; client-provided timestamps
  are never trusted for deadline enforcement.
- abandoned carts may be physically cleaned up later; do not hard-delete active
  carts as the primary lifecycle behavior.
- reads do not lazily update an expired active Cart to `abandoned`; a future
  scheduled process may persist that status when operationally needed.

`Store.operation.guestOrderingDurationMinutes` is optional and, when present,
must be from 15 minutes through 12 hours. Store setting changes affect only new
Carts. Checkout sets `Order.orderingClosesAt` to the Cart's configured
`orderingClosesAt`, or falls back to the Cart's fixed `expiresAt` when the store
has no configured duration. This gives every pay-later Order a hard group
ordering deadline without restarting the clock at checkout.

Join enforcement, guest-session `joinCode` exposure, Invite availability, and
future merchant Join Code display must use one shared Join Code usability
predicate. Do not duplicate pay-first, payment, completion, cancellation, or
deadline checks across those flows.

Multiple active Carts may coexist for the same table. Orders are identified by
`displayNumber`; `tableNumber` is not unique.

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

Guest adds more before payment:

- allowed only when `orderType = dine_in`, `checkoutMode = pay_later`,
  `paymentStatus = unpaid`, and `Order.status` is not `completed` or
  `cancelled`, and optional `orderingClosesAt` has not passed
- this includes already `ready` dine-in orders that have not been paid,
  completed, cancelled, or closed by the optional ordering deadline
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
  `preparing`, or `ready`, as long as `paymentStatus = unpaid` and the order is
  not `completed` or `cancelled`
- `Order.paymentStatus = paid`
- `Order.paidAt = now`
- if all active batches are already `ready`, `Order.status = completed` and
  `Order.completedAt = now`
- otherwise `Order.status` remains the current batch rollup; a later batch
  advance/cancel auto-completes the pay-later order once every active batch is
  `ready` and payment is already collected
- the join code becomes invalid
- no more guest add-ons are allowed

## Pay First Orders

Pay-first applies to takeaway and may also apply to dine-in. Dine-in pay-first
can use a table number or rely only on the order display number for pickup.

Create and submit cart:

- create an active cart with `checkoutMode = pay_first`
- dine-in pay-first carts have a usable Join Code before submission
- on guest submission, set `Cart.status = checked_out`
- create `Order`
- `Order.status = pending_confirmation`
- `Order.paymentStatus = unpaid`
- create the first batch with `status = pending_confirmation`
- reserve `businessDate`, `dailySequence`, and `displayNumber`
- submission makes a dine-in pay-first Join Code unusable

Staff confirms payment:

- `Order.paymentStatus = paid`
- `Order.paidAt = now`
- first batch `status = preparing`
- first batch `confirmedAt = now`
- `Order.status = preparing`

Kitchen and pickup:

- when food is ready, batch `status = ready` and `Order.status = ready`
- staff marks the order complete after pickup has no remaining operational work
- completion requires `Order.paymentStatus = paid` and every active batch to be
  `ready`
- `Order.status = completed`
- set `Order.completedAt = now`

Pay-first add-ons are separate orders for MVP for both takeaway and dine-in
pay-first. Do not mutate the previous pay-first order for add-ons.
They do not need to wait for the previous pay-first order to reach
`completed`.

## Staff Edits And Cancellation

Guests cannot modify submitted batches. Staff act on submitted work from the
merchant order management screens — see `docs/features/merchant-orders.md`.

Implemented staff actions:

- advance a batch through `preparing → ready`
- cancel a batch (a round)
- cancel the whole order
- mark payment collected (checkout); for `pay_later` this also completes the
  order
- complete the order (`pay_first`)

Planned, not yet built: update submitted items and cancel individual items
within a batch. Until then, item-level corrections are handled by cancelling the
whole batch.

Cancellation behavior:

- a cancellation captures one or more reasons (`no_show`, `out_of_stock`,
  `customer_request`, `other`) plus an optional free-text note, at both the
  order and the batch level.
- cancelled orders keep their daily number; daily numbers are not reused.
- cancelling the whole order sets `Order.status = cancelled`,
  `Order.cancelledAt = now`, and **zeroes the order totals** (`items = []`,
  `subtotal = serviceFeeAmount = totalAmount = 0`): a cancelled order is no
  revenue, and `total` represents revenue (loss is not tracked). Each batch
  keeps its own items and subtotal as a record.
- cancelling a single batch sets `OrderBatch.status = cancelled` and
  `OrderBatch.cancelledAt = now`, and **recomputes the order totals from the
  remaining non-cancelled batches**. The cancelled round keeps its own
  items/subtotal for the record but no longer counts toward the order total.
- submitted batches can be cancelled by staff, including `ready` batches, for
  operational exceptions (sold-out, mistakes, waste, guest requests). The only
  terminal batch state is `cancelled`.
- cancelling rounds individually does NOT end the order: if every round is
  cancelled, the order stays open (`Order.status` rolls back to
  `pending_confirmation`) so the guest can still add another round. Only an
  explicit whole-order cancel sets the terminal `cancelled`.
- unpaid cancellation keeps `paymentStatus = unpaid`; cancelling a paid order
  sets `paymentStatus = voided` (the platform does not process payments, so
  there is no refund flow).

## Notes

- `Order.status` is the order-level operational summary.
- `ready` means food is prepared and waiting for delivery or pickup. For
  pay_later orders, `ready` is the terminal prep stage; payment completes the
  order. For pay_first orders, `completed` is reached via the explicit Complete
  action after all rounds are ready.
- `completed` means the order is finished: for pay_later this is set
  automatically when payment is collected; for pay_first it is set explicitly
  by staff after all rounds are ready.
- `OrderBatch.status` is the source of truth for individual submitted kitchen
  batches.
- Batch lifecycle: `pending_confirmation → preparing → ready` (+ `cancelled`).
  `ready` is the terminal prep stage.
- Staff views should prioritize `pending_confirmation` batches.
- Customer views can show the order-level summary plus each user's item list.
