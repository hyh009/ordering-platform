# Manual Test — Merchant Order Status Lifecycle

Covers the merchant order **detail** page: checkout, order/round cancellation
(multi-reason + note), per-Round status advancement, order completion, conflict
auto-refresh, the freshness indicator, and live sync to the guest.

Most of these are hard to cover with unit tests (concurrency, real-time sync,
visual state), so verify them by hand.

## Prerequisites — seed a few orders

Use the storefront to create orders in different shapes:

- One **dine-in / pay-later** order with **multiple Rounds** (place an order, then
  add on 1–2 more times so it has Round 1 / 2 / 3).
- One order with a **single Round**.
- One **unpaid** order and one **paid** order.
- One **pay-first** (takeaway or dine-in pay-first) order.

For concurrency (G) and SSE (I) you also need the **guest** order-tracking page
open for the same order, alongside the merchant detail page.

---

## A. Round advancement (forward-only)
- [ ] "Awaiting confirmation" Round → button reads **Start preparing**; clicking → Preparing
- [ ] Preparing → button **Mark ready** → Ready
- [ ] Ready → **no advance button**, shows ✓ Ready, card de-emphasized
- [ ] No way to move a Round backward; no "skip stage" button anywhere

## B. Order status = rollup of its Rounds (the key behavior)
- [ ] Both Rounds "Awaiting" → order badge **Awaiting confirmation**
- [ ] Push R2 to Preparing while R1 still Awaiting → order shows the **slowest** Round (Awaiting)
- [ ] Both Rounds Preparing → order **Preparing**
- [ ] **Mixed**: R1 Ready, R2 Preparing → order still **Preparing** (held by slowest)
- [ ] All Rounds Ready → order **Ready**

## C. Complete order (pay_first only)
- [ ] **pay_later order**: Complete button is **hidden** entirely (payment is the finisher for pay_later)
- [ ] **pay_first order**: Complete button is shown while order is not terminal
- [ ] While any Round is not Ready/Cancelled → **Complete** button disabled, hover shows tooltip explaining why
- [ ] All non-cancelled Rounds Ready → **Complete** enabled; clicking → order **Completed**
- [ ] One Round cancelled + the rest Ready → Complete still allowed
- [ ] After Completed: all advance / cancel / Complete controls gone, page is read-only
- [ ] (Edge) All Rounds cancelled → order auto-becomes **Cancelled** (via rollup)

## D. pay_later checkout auto-complete
- [ ] **pay_later unpaid** order → **Mark paid** present; clicking confirms → `paymentStatus = paid` AND `status = completed` in one action
- [ ] After checkout on pay_later: order shows Completed, no further Complete button is ever shown

## E. Cancel whole order (multi-reason + note)
- [ ] "Cancel order" opens a modal with 4 checkboxes (No show / Out of stock / Customer request / Other) + a note field
- [ ] **No reason checked and empty note** → submit is blocked / disabled
- [ ] Reasons only → can submit; note only → can submit
- [ ] After cancel: header shows "Reasons: …" and "Note: …"; order badge **Cancelled**
- [ ] Cancelling a **paid** order → payment status becomes **Voided**
- [ ] A Completed order has no Cancel button

## F. Cancel a single Round
- [ ] A Round's "Cancel this round" opens the **same** reason modal (multi-select + note)
- [ ] A **Ready** Round can still be cancelled (Ready is not a terminal state for cancellation)
- [ ] After cancel: that Round is greyed + items struck through, shows its reasons/note
- [ ] After cancelling one Round, the order status re-rolls from the remaining Rounds

## G. Checkout (Mark paid)
- [ ] Unpaid → **Mark paid** present; clicking → for pay_later: Paid + Completed; for pay_first: Paid (status unchanged)
- [ ] Paid → Mark paid gone
- [ ] (If you have a pay-now / pending_payment order) checkout advances status `pending_payment → pending_confirmation` (pay_first only)

## H. Conflict auto-refresh (concurrency — most bug-prone)
- [ ] Open two windows: merchant detail page + storefront for the same table. Leave the merchant page **untouched**.
- [ ] On storefront, **add a new Round** (so the order changes server-side).
- [ ] Back on the (stale) merchant page, click any action (advance / cancel / checkout) → toast "order changed, please refresh" **and the page auto-refreshes** to show the new Round.
- [ ] The merchant action must **not** overwrite / drop the guest's newly added Round.

## I. Freshness indicator
- [ ] Header row shows "Updated just now / X min ago" + a Refresh button
- [ ] Wait ~30s — the text ticks from "just now" to "1 minute ago" on its own
- [ ] Refresh re-fetches and resets the time; Refresh is disabled while loading

## J. Live sync to the guest (SSE)
- [ ] When the merchant advances a Round / cancels / checks out, the guest's order-tracking page updates **immediately**, without a manual refresh

## K. Permissions
- [ ] Signed in as **staff** → these mutations return 403 from the API (and any UI that hides them for staff should not show the buttons)
- [ ] org_owner / org_admin → all actions work

---

_Feature plans: `docs/agent/temp/plan/order-lifecycle-simplify-remove-served-20260629-2053.md`
supersedes `docs/agent/temp/plan/merchant-order-status-lifecycle-20260628-2210.md`._
