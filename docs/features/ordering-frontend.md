# Ordering Frontend (Guest)

The guest-facing ordering experience: a guest scans a QR code to enter a store,
browses the menu, builds a cart, submits an order, tracks order status live, and
(for dine-in pay-later) co-orders with others via a join code and adds on.

Backend order behavior is in [`ordering.md`](./ordering.md); flow diagrams are in
[`ordering-flow.md`](./ordering-flow.md). This document describes the **agreed
guest frontend behavior**. The frontend code and the guest public API are not yet
implemented; the Code Map and API sections mark "existing vs planned".

MVP does not integrate online payment. Staff manually confirms payment.

## Code Map

Existing (backend domain the frontend depends on):

- `apps/api/src/models/cart/model.ts`
- `apps/api/src/models/order/model.ts`
- `apps/api/src/models/counter/model.ts`
- `apps/api/src/models/store/model.ts` (`operation.orderModes`)
- `packages/shared/src/contracts/store.ts`

Planned (following existing frontend architecture conventions):

- `apps/web/src/pages/guest/...` (each page: View + Page VM hook)
- `apps/web/src/features/guest/...` (runtime / store / actions / commands)
- `apps/web/src/models/{guestMenu,cart,order}/...`
- `apps/web/src/services/{guestMenu,guestCart,guestOrder}.service.ts`
- Backend guest public routes `apps/api/src/routes/v1/public/...`, cart/order/
  public-menu contracts in `packages/shared`, guest token issuance, SSE push

> Interim planning detail:
> `docs/agent/temp/plan/guest-ordering-frontend-20260610-1126.md`.

## Frontend

The public route tree is mounted at `/s/:storeId`, mobile-first, outside
`RequireAuth`.

### Pages

1. **Landing** — `/s/:storeId?table=T1`
   Store name/description/open status; order type (dine-in/takeaway) chosen from
   `Store.operation.orderModes` (auto-skipped when only one is enabled); the
   `table` URL query is carried through when present, otherwise omitted (the
   guest side never prompts for a table number). Shows the chooser state based on
   whether a guest token exists in localStorage (see below).
2. **Join** — `/s/:storeId/join/:joinCode`
   Validate the join code → enter a nickname (skippable) → join the same cart →
   go to the menu.
3. **Menu** — `/s/:storeId/menu`
   Horizontal category nav, product cards (image/name/price/sold-out badge), and
   a sticky cart bar at the bottom; in add-on mode the top shows "adding to order
   #XX".
4. **Product configuration** — bottom sheet (not a separate route)
   Modifiers (single/multiple, min/max), quantity, item notes, allergen/dietary
   markers.
5. **Cart** — `/s/:storeId/cart`
   Items grouped by participant (you may edit only your own before submit),
   subtotal/service fee/total, order-level notes, "invite others to co-order"
   (join-code QR + link), and submit (any participant may submit; confirm before
   submitting).
6. **Order tracking** — `/s/:storeId/orders/:orderId`
   Large display number, order- and batch-level status (live via SSE), line
   items, total, payment status; pay-later while unpaid shows "add on" → menu
   add-on mode; pay-first shows "start another order"; `completed`/`cancelled`
   shows an end screen and clears the guest token.

### Landing chooser state machine

- No guest token detected: `[Start new order]` `[Join someone's order]`
  (MVP = scan an invite QR).
- Guest token detected: `[Resume ordering]` `[Start new order]`
  `[Join someone's order]`.
- Tapping "Resume ordering" when the backend reports the order has ended → modal
  "your previous order has ended" → clear the token → fall back to the
  no-token state (lazy validation; no loading gate on the landing).
- **Confirm before leaving on switch**: when an active cart exists but the guest
  picks "Start new order / Join another", confirm "abandon the current order?"
  → leave → then proceed. A browser belongs to only one cart at a time.

### Always-available escape hatch

The ordering UI (menu/cart/tracking) header always keeps a way back to the
chooser:

- **Back to landing (non-destructive)**: pure navigation; the token is kept and
  "Resume ordering" remains.
- **Leave this group / start over (destructive)**: performs leave, clears the
  token, and the chooser returns to a clean state.
- The order tracking page itself shows an end screen + "Start another order /
  Home" and clears the token when the order ends, so it is never a dead end.

### Main edge states

Store closed (menu browsable; warning banner at the top, add-to-cart/submit
buttons disabled), invalidated join code, expired cart (abandoned), missing
store/order, and items sold out at submit time (per-item errors).

## Flows

### A. Dine-in pay-later group co-ordering

1. Scan QR (table QR with table number, or a generic store QR) → Landing →
   choose dine-in → menu.
2. When the first person adds an item, the server creates the cart (issues a
   guest token + join code).
3. Friends scan the co-order QR on the cart page → Join page, enter a nickname →
   order from the same cart.
4. Any participant submits from the cart → an Order is created (first batch
   `pending_confirmation`) → everyone can open the order tracking page.
5. The tracking page shows batch status live via SSE; **while unpaid**, "add on"
   → menu add-on mode → submit appends a new batch.
6. Staff takes payment → the join code is invalidated, add-on disappears; staff
   completes → end screen.

### B. Pay-first (takeaway, or dine-in pay-first)

1. Scan QR → choose takeaway (or dine-in pay-first, table number optional) →
   menu → cart → submit.
2. Tracking page shows the display number + "please pay at the counter".
3. Staff confirms payment → preparing → ready (prominent pickup prompt) →
   served/completed.
4. Add-ons always "start another order" with a fresh cart; the original order is
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
  participant and issues that participant's token), add/edit item (own items
  only, before submit), leave (removes the participant), submit (creates or
  appends an Order).
- Order: fetch, add on (pay-later appends a batch / pay-first starts a new cart),
  SSE stream of order and batch status.

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
  localStorage and sent as a bearer; MVP has no refresh, with a generous fixed
  `exp`. The token only authenticates "identity + scope"; **authorization always
  checks live order state** (after payment, the add-item endpoint rejects based
  on order status; no token revocation needed).
- **Joining a group always requires the join code** (shared within your own
  party); scanning a bare table QR never auto-joins an existing cart, so
  strangers cannot pad your bill (a pay-later safety concern).
- **Leaving a cart**: the backend removes the participant from
  `cart.participants[]` → the old token's `participantId` is no longer found and
  is implicitly invalidated; the participant's un-submitted items are removed
  with them; when the last participant leaves, the cart becomes `abandoned`.
  There is no "owner" privilege; the creator can leave too.

## Notes

Decisions (promoted from the plan):

- Real-time push uses **SSE**; in MVP it is used only for order-tracking status
  updates (one-directional). Group co-ordering relies on the join code plus a
  refetch when opening the cart page — no live cart sync. AI chat streaming can
  reuse SSE later; upgrade to WebSocket only if true bidirectional needs arise.
- Nicknames are skippable, auto-assigned as "Guest N".
- The server cart is created only on the first add-item or invite (reduces
  abandoned carts).
- Currency is fixed to NT$ in MVP (`product.price` has no currency field).
- URLs use `/s/:storeId`; a store-level slug is deferred (slug currently exists
  only on Organization, and an org may have multiple stores).
- Join-code sharing in MVP supports QR + link only; manual code entry is
  deferred.
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
