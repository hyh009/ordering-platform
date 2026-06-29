# Ordering Frontend (Guest)

The guest-facing ordering experience: a guest scans a QR code to enter a store,
browses the menu, builds a cart, submits an order, tracks order status live, and
co-orders on dine-in carts via a Join Code. Dine-in pay-later groups may
continue joining and adding on after checkout while the order remains open.

Backend order behavior is in [`ordering.md`](./ordering.md); flow diagrams are in
[`ordering-flow.md`](./ordering-flow.md). Different-store browser tab and guest
session isolation behavior is in
[`guest-multi-store-sessions.md`](./guest-multi-store-sessions.md). This
document describes the guest frontend behavior. Landing, Resume, Join, and Recent
orders behavior is in
[`guest-ordering-entry-flow.md`](./guest-ordering-entry-flow.md). The guest
frontend and the guest public API are implemented; the dine-in pay-later
reusable-cart add-on flow is detailed in [`ordering-flow.md`](./ordering-flow.md).
Live SSE order sync is not yet wired — order tracking currently refreshes
manually.

MVP does not integrate online payment. Staff manually confirms payment.

## Code Map

Existing (backend domain the frontend depends on):

- `apps/api/src/models/cart/model.ts`
- `apps/api/src/models/order/model.ts`
- `apps/api/src/models/counter/model.ts`
- `apps/api/src/models/store/model.ts` (`operation.orderModes`)
- `packages/shared/src/contracts/store.ts`

Implemented (frontend, following the frontend architecture conventions):

- `apps/web/src/pages/storeFront/...` (each page: View + Page VM hook + commands)
- `apps/web/src/features/storeFront/...` (runtime / stores / actions / commands;
  `cartWorkflow`, `sessionWorkflow`, `orderHistory`)
- `apps/web/src/models/{storeFrontMenu,cart,order}/...`
- `apps/web/src/services/{storeFrontMenu,storeFrontCart,storeFrontOrder}.service.ts`

Implemented (backend the frontend calls):

- guest public routes `apps/api/src/routes/v1/public/guest/...`
- `apps/api/src/services/guestOrdering.service.ts`, cart/order/public-menu
  contracts in `packages/shared`, guest token issuance

Not yet wired: live SSE push (order tracking refreshes manually for now).

## Frontend

The public route tree is mounted at `/s/:storeId`, mobile-first, outside
`RequireAuth`.

### Pages

1. **Landing** — `/s/:storeId?table=T1`
   Store name/description/open status and entry actions. Choosing "New order"
   reveals the enabled dine-in/takeaway choices. The `table` URL query is carried
   through when present, otherwise omitted; the guest side never prompts for a
   table number.
2. **Join** — `/s/:storeId/join` or `/s/:storeId/join/:joinCode`
   Manual entry navigates to the shared Join confirmation route. Confirmation
   shows the Join Code, avatar picker, and optional custom display name before
   joining the Cart or open pay-later Order.
3. **Menu** — `/s/:storeId/menu`
   Horizontal category nav, product cards (image/name/price/sold-out badge), and
   a sticky cart bar at the bottom; in add-on mode the top shows "adding to order
   #XX".
4. **Product configuration** — bottom sheet (not a separate route)
   Modifiers (single/multiple, min/max), quantity, item notes, allergen/dietary
   markers.
5. **Cart** — `/s/:storeId/cart`
   Items grouped by participant (you may edit only your own before submit),
   subtotal/service fee/total, order-level notes, invite entry, and submit (any
   participant may submit; confirm before submitting).
6. **Order tracking** — `/s/:storeId/orders/:orderId`
   Large display number, order- and batch-level status, each batch's items and
   "added by", totals, payment status. While the server-computed `canAddOn` is
   true it shows "繼續加點" → menu add-on mode; otherwise it shows "Refresh
   status". A finished order or one opened from local history shows "Start another
   order" / "Back to recent orders". Status updates via manual refresh today
   (SSE push is planned).
7. **Recent orders** — `/s/:storeId/orders`
   Read-only entry to orders this browser participated in during the last 24
   hours.
8. **Invite** — `/s/:storeId/invite`
   Shows store name, Join Code, invite link, QR Code for that same link, copy
   link, and return-to-menu action. All participants may share it. If inviting
   or adding items is no longer allowed, show an unavailable modal and return to
   Landing.

### Landing entry flow

Landing chooser states, Resume behavior, dedicated Join Code entry, and
browser-local Recent orders are defined in
[`guest-ordering-entry-flow.md`](./guest-ordering-entry-flow.md).

### Always-available escape hatch

The ordering UI (menu/cart/tracking) header always keeps a way back to the
chooser:

- **Back to landing (non-destructive)**: pure navigation; the token is kept and
  "Resume ordering" remains.
- **Leave this group / start over (destructive)**: performs leave, clears the
  token, and the chooser returns to a clean state. This is allowed for a
  not-yet-submitted cart, but **not** for an unfinished order — a submitted,
  unpaid/unfinished order cannot be abandoned to start another; the guest must
  resume it (see [`guest-ordering-entry-flow.md`](./guest-ordering-entry-flow.md)).
- The order tracking page itself shows an end screen + "Start another order /
  Home" and clears the token when the order ends, so it is never a dead end.

### Main edge states

Store closed (menu browsable; warning banner at the top, add-to-cart/submit
buttons disabled), invalidated join code, expired cart (abandoned), missing
store/order, and items sold out at submit time (per-item errors).

The backend checks Cart expiry and the optional ordering deadline for every Cart
API, including session restore and reads. Frontend deadline checks only control
presentation. Each backend operation compares against one server-side request
time, so a request received before the deadline may complete after it during an
optimistic concurrency retry.

## Flows

### A. Dine-in pay-later group co-ordering

1. Scan QR → Landing → choose dine-in → choose avatar and optional custom
   display name → create Cart and open Menu.
2. Friends use manual Join Code entry, scan the Invite QR, or open the copied
   Invite link → Join confirmation → choose avatar and optional custom display
   name → join the same Cart.
3. Any participant submits from the cart → an Order is created (first batch
   `pending_confirmation`) and the cart is cleared but stays active → every
   participant can read the order (access is by participant membership, not tied
   to the submitter's device).
4. While `canAddOn` is true (unpaid, unfinished, before `orderingClosesAt`),
   "繼續加點" → menu add-on mode → add to the still-active shared cart → submit
   flushes a new batch. The same submit serves the first and later rounds, and
   the same window permits new participants to join. (Status refreshes manually;
   SSE is planned.)
5. Staff takes payment → the join code is invalidated, add-on disappears; staff
   completes → end screen.

### B. Pay-first (takeaway, or dine-in pay-first)

1. Scan QR → choose takeaway or dine-in pay-first → choose participant identity
   → menu → cart → submit.
2. Dine-in participants may share and use the Join Code before checkout; it
   becomes unusable at checkout. Takeaway has no group ordering.
3. Tracking page shows the display number + "please pay at the counter".
4. Staff confirms payment → preparing → ready (prominent pickup prompt) →
   completed.
5. Add-ons always "start another order" with a fresh cart; the original order is
   not mutated.

### C. Resuming after interruption

Scan any QR for the store or reopen the page → the guest token is restored → an
active cart returns to cart/menu; an unfinished order returns to tracking.

## API

Planned guest public API (no merchant login; the guest token authenticates
identity). Expected surface:

- Public menu: returns the store's `published + isActive` products with their
  modifiers/categories; **must not leak merchant-only fields**.
- Cart: create (issues guest token + join code), join (join by join code, adds a
  participant and issues that participant's token; if an order already exists the
  joiner is added to it too), add/edit item (own items only), leave (removes the
  participant), submit (flushes the cart into a new Order batch — creating the
  Order on the first round — in one transaction). Add-on reuses the same submit;
  there is no separate add-on-batch endpoint.
- Session: returns the live cart and the order together when both exist (add-on
  mode), so a participant sees the submitted order and the next-round draft.
- Order: fetch (resolved by participant membership, independent of cart state, so
  any participant can read it; carries the server-computed `canAddOn`). Live SSE
  stream of order/batch status is planned, not yet wired.

Request/response shapes and error codes are defined with their contracts during
the Phase 0 backend work.

## Data

- **Table number**: purely a **label** for staff delivery — not unique, not a
  join key. Multiple active carts are allowed per table (supports shared seating:
  same `tableNumber`, distinguished by each order's `displayNumber`, billed
  separately). The guest side never prompts for it; it is only carried in via the
  QR's URL query.
- **Guest token**: a JWT issued by the backend at cart-create / join time; its
  payload holds only stable identity references (`storeId` + `cartId` +
  `participantId` + `aud: "guest"` + `iat/exp`), never mutable data. Stored in
  localStorage under a store-scoped key and sent as a bearer; MVP has no refresh,
  with a generous fixed `exp`. The token only authenticates "identity + scope";
  **authorization always checks live order state** (after payment, the add-item
  endpoint rejects based on order status; no token revocation needed).
- **Participant identity**: `participantId` is authoritative. The guest chooses
  an `avatarKey` and may enter a custom `displayName`; when omitted, the UI
  localizes the animal label and appends the uppercase final five characters of
  `participantId`, such as `Anonymous Cat A3F2B`.
- **Joining a group always requires the join code** (shared within your own
  party); scanning a bare table QR never auto-joins an existing cart, so
  strangers cannot add items to a dine-in group.
- **Leaving a cart**: the backend removes the participant from
  `cart.participants[]` → the old token's `participantId` is no longer found and
  is implicitly invalidated; the participant's un-submitted items are removed
  with them; when the last participant leaves, the cart becomes `abandoned`.
  There is no "owner" privilege; the creator can leave too.

## Notes

Decisions (promoted from the plan):

- Real-time push will use **SSE** for order-tracking status updates
  (one-directional), but it is **not yet wired**: order tracking and group
  co-ordering currently rely on the join code plus a refetch (manual refresh /
  reopening the cart) — no live sync yet. AI chat streaming can reuse SSE later;
  upgrade to WebSocket only if true bidirectional needs arise.
- Dine-in pay-later add-on reuses the cart as a **reusable per-round draft**:
  submit flushes the cart into a new order batch and clears it while keeping it
  active; order access is decoupled from the cart (participant membership), and
  whether a guest may add on is the server-computed `OrderDto.canAddOn`. See
  [`ordering-flow.md`](./ordering-flow.md).
- Avatar selection is required and randomly preselected; custom display names
  are optional. Participants cannot change either after joining in MVP.
- Currency is fixed to NT$ in MVP (`product.price` has no currency field).
- URLs use `/s/:storeId`; a store-level slug is deferred (slug currently exists
  only on Organization, and an org may have multiple stores).
- Invite QR and copied links contain only `/s/:storeId/join/:joinCode`; they do
  not contain session or participant data and do not auto-join.
- Before joining, Join confirmation loads only the public Store summary. It does
  not expose existing participants, participant count, Cart items, table number,
  or Order details.
- Guests cannot modify a submitted batch (existing rule): the guest UI only shows
  "please ask staff".

Known follow-ups:

- The backend prerequisites are large: guest public API, cart/order/public-menu
  contracts, guest token, and SSE are all new, and every guest page depends on
  them.
- The join code needs sufficient length and rate limiting against guessing; the
  table number can be spoofed and relies on staff verification.
- Concurrent cart edits must be reconciled by the backend against latest state.
- The current design system is desktop-admin oriented; mobile patterns (bottom
  sheet, sticky bar) need additions to shared components.
