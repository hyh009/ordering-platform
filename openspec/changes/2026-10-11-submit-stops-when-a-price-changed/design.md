## Context

`submitCart` (`apps/api/src/modules/guestOrdering/guestOrdering.data.service.ts`)
flushes the cart's lines into an order inside one Mongo transaction. Before it
writes, it calls `findUnavailableItems`, which loads each product and the
store's active modifiers and refuses lines whose product or options are gone,
unpublished, or sold out. The order's totals are then taken from the cart's
stored `subtotal` / `totalAmount` (round 1) or recomputed from the lines
(add-on rounds). Neither path looks at current prices.

A line's `unitPrice` is fixed when it is added or edited
(`buildCartItemSnapshot`: product price plus selected option adjustments). Names
are stored beside it as localized snapshots. Nothing on the merchant side
touches carts when a product or modifier changes.

The check already loads exactly what a price comparison needs, so the
comparison costs no additional query.

Follows `docs/agent/backend/architecture.md` and
`docs/agent/backend/throwing-errors.md` on the API side;
`docs/agent/frontend/error-mapping.md`, `error-feedback.md` and `i18n.md` on the
web side; and `docs/agent/workflows/shared-contracts.md` for the new error code.
No intentional deviation.

## Goals / Non-Goals

**Goals:**

- A guest never pays a price they have not seen.
- After a refusal the cart already shows the new prices, so confirming is one
  more tap, not an edit.
- The order records names as they were at submission.

**Non-Goals:**

- Repricing carts when the merchant edits a product. Carts are corrected at the
  moment it matters, which is submission.
- Repricing or renaming lines already on an order.
- Showing the guest a per-line "was NT$X, now NT$Y" diff in the cart. The
  refusal carries the data; presenting it is a follow-up.
- Changing how availability is reported.

## Decisions

### D1. Refuse on any difference, up or down

The rule is equality of stored and current unit price. A price drop is refused
the same as a rise.

*Alternative:* let drops through silently, since the guest only benefits. Not
chosen: it makes the order total differ from the total the guest confirmed, and
"the guest saw this number" is the property worth keeping. It also needs a
second rule for the merchant who lowers a price by mistake and sees orders at
the old price. If drops turn out to be noisy in practice, relaxing it is a
one-line change in the comparison.

### D2. Repricing is a second write, after the transaction aborts

A refusal must leave the cart corrected, but refusing means throwing, and
throwing inside `withTransaction` rolls back every write made in it. So the
repricing cannot ride in the same transaction.

The reconcile step runs inside the transaction as today and, on a price
difference, throws a typed internal error carrying the corrected lines. The
catch sits outside `withTransaction`, applies the new prices to the cart
through the existing `updateCartWithRetry` (matching lines by id, recomputing
totals with the existing `computeTotals`), and then throws the public
`PRICE_CHANGED` failure.

*Alternative:* refuse without repricing and make the client re-add or edit each
line. Not chosen: the guest would hit the same refusal on the next submit with
nothing they can act on, and the cart would keep showing a price the order will
not honour.

*Alternative:* reprice first, then submit in the same request. Not chosen: it is
the silent repricing this change exists to remove.

A line edited or removed by another participant between the refusal and the
repricing write is matched by id; a missing line is skipped, and an edited line
already carries a freshly built price.

### D3. One reconcile pass returns availability, price changes, and fresh names

`findUnavailableItems` is widened into a single pass over the loaded products
and modifiers that returns the unavailable lines, the price changes, and the
lines with current names applied. Availability is evaluated first and wins (spec:
availability before price), so a sold-out line never causes repricing as a side
effect.

*Alternative:* a second function beside it. Not chosen: it would load the same
products and modifiers again, and the two would drift on what "the same
selection" means.

### D4. Names are refreshed on success, not on refusal

Names are display-only and have no consent to ask for, so they are applied to
the lines that become the order, in both round 1 and add-on rounds. They are
not applied to the cart on refusal beyond what D2 already writes, and they never
cause a refusal. This is what makes an order record the names of the moment it
was placed, which is the correct freezing point; the cart keeps showing its
snapshot until then.

The cart panel in the screenshot that prompted this change will still show the
old name until submission or edit. That is accepted: the cart is a draft, and
the name is corrected where it is frozen.

### D5. A new error code, `PRICE_CHANGED`, as a conflict with details

The refusal is a `ConflictError` with code `PRICE_CHANGED` and
`details.changedItems: { itemId, productId, previousUnitPrice, currentUnitPrice }[]`,
mirroring how `PRODUCT_SOLD_OUT` carries `unavailableItems`. The code and the
detail shape are added to `packages/shared` so the client does not hand-write
them. Money is carried as the same integer unit the cart already uses.

### D6. The web maps it to one new reason and re-reads the cart

`PRICE_CHANGED` maps to a new storefront reason `price-changed` with its own
message, presented as a toast like `sold-out`. The submit command, on that
failure, re-reads the cart through the existing cart service and hydrates the
cart store through the existing feature action, so the page shows the corrected
prices without the guest reloading. The view does nothing new.

## Risks / Trade-offs

- **A merchant edits prices during a rush and guests see repeated refusals.**
  Mitigated by D2: after one refusal the cart is current, so a guest is refused
  at most once per actual change.
- **The repricing write can fail after the transaction aborted.** The guest then
  gets a generic failure, and the cart is unchanged, so the next submit refuses
  again and retries the repricing. No state is lost.
- **Reading an option's current price assumes the active-modifier list contains
  every selected option.** Options missing from it are already treated as
  unavailable and handled before price is looked at.
- **Existing carts are not migrated.** They are corrected on their next
  submission, which is the only moment it matters.

## Open Questions

- Does the cart page reload the cart after a failed mutation on its own, or only
  after specific reasons? Task 3.3 reads this before adding an explicit re-read;
  if it already reloads, D6's re-read is dropped.
