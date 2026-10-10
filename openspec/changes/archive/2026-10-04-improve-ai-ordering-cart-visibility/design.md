## Context

See proposal.md — Why.

What the current code already provides, and what shapes the approach:

- `features/storeFront/components/ParticipantOrderSection.tsx` and
  `OrderTotals.tsx` render the cart on the cart page. Both are prop-driven, and
  `ParticipantOrderSection` takes `onChangeQuantity` / `onRemove` as optional, so
  the same component serves an editable and a read-only section.
- Cart state lives in `runtime.stores.cart`. `useMenuPageVM` already subscribes to
  it for the menu page's cart bar, and the storefront SSE stream already keeps it
  current, so a second cart surface needs no load flow of its own.
- `useCartPageVM` derives `participantGroups` (items bucketed by
  `addedByParticipantId`, with `isCurrentUser`) inline. This is the one piece the
  assistant surface needs that is not yet reusable.
- `menuPage.commands` exposes `addItem` only. `updateItem` and `removeItem`
  already exist on `runtime.commands.cart` — the assistant's apply flow uses them.
- `AssistantPanel` is `fixed inset-0 z-page-modal` with a `bg-black/40` overlay.
  `global.css` defines an ordered z token scale, with `--z-feedback-modal` and
  `--z-feedback-toast` above `--z-page-modal`.

Guides this design follows: `docs/agent/frontend/architecture.md`,
`docs/agent/frontend/state-ownership.md`,
`docs/agent/frontend/code-placement.md`,
`docs/agent/frontend/shared-components.md`, `docs/agent/frontend/i18n.md`, and
`docs/agent/frontend/architecture-validation.md` for the final check. No
intentional deviation.

`packages/shared` contracts do not change. Neither does `apps/api`.

## Goals / Non-Goals

**Goals:**

- One cart rendering, used by both the cart page and the assistant surface.
- No new cart load or subscription path; the assistant reads the cart the page
  already has.
- The responsive split costs no extra state: the layout is chosen in CSS.

**Non-Goals:**

- Replacing the cart route. It stays as the place to review and submit; this only
  removes the need to visit it mid-conversation.
- Widening what the assistant itself can do. Submission becomes reachable from the
  assistant surface, but it stays the guest's action behind a confirmation; no
  assistant operation submits anything.
- Any change to the assistant's prompt, response contract, or proposal flow.

## Decisions

### Extract the participant grouping instead of copying it

`participantGroups` is a pure derivation from a cart and the current participant
id. Two VMs needing it means it belongs in `src/models/cart` beside
`getOrderingParticipantDisplayName`, as a plain function, and both
`useCartPageVM` and the assistant VM call it.

Alternative considered: compute it again in the assistant VM. Rejected — the
grouping decides who may edit what (`isCurrentUser`), so two copies that drift
would mean two different answers to "is this mine", in the one place where a wrong
answer lets a guest edit someone else's items.

Alternative considered: a shared hook. Rejected — it needs no React, and a pure
function is testable in this workspace while a hook is not.

### The layout is CSS, the toggle is component-local

Two layouts, selected with `md:hidden` / `hidden md:block`, not with a JS
breakpoint listener. The cart-visibility toggle below `md` is a pure visibility
toggle, so per `docs/agent/frontend/state-ownership.md` it stays component-local
rather than entering `useAssistantPanelVM`, which owns page flow.

That makes the toggle inert at `md` and up with nothing to synchronise: the side
column is always rendered there, so a stale `true` from a resize changes nothing.

Alternative considered: a `useMediaQuery` hook driving one layout. Rejected — it
adds a state source that must agree with CSS, and disagreeing on the first paint
is exactly the flicker the CSS version cannot have.

### `md` as the breakpoint

Agreed with the user. At 768–1024 the two columns are narrow (roughly a 460px
conversation beside a 300px cart), which is accepted: a cramped side-by-side still
beats leaving the conversation. The panel's current `lg:max-w-lg` centred modal
must widen to host two columns.

### The in-assistant cart is editable

A read-only cart would still send the guest to the cart route to change a
quantity, which is the friction being removed. Editing reuses
`runtime.commands.cart`, so validation, concurrency and SSE behaviour stay in one
place — the same reason the assistant proposes rather than applies server-side.

Other participants' sections render without the edit handlers, which is how
`ParticipantOrderSection` already expresses read-only.

### The mobile cart overlay stays inside the panel's stacking context

Positioned within `AssistantPanel`'s own element rather than as a new fixed layer,
so no new z token is added and `--z-feedback-modal` / `--z-feedback-toast` stay
above it — a toast raised by a failed quantity change must still be readable.

### Remove the result hint rather than reword it

`guest.assistant.proposalResultHint` tells the guest to go and check the cart. With
the cart on screen the sentence is noise, and rewording it would keep a line whose
only job was to compensate for the cart being hidden.

### Apply gets its own in-flight flag, and a guard below the UI

`applyProposal` currently sets no in-flight state at all. The panel passes
`isApplying={vm.isSending}`, but `sendStarted()` is only called by `sendMessage`,
so the Apply control is live for the whole apply. A second press re-reads the same
`pending` rows — row statuses are written only after the loop — and posts every
operation again.

So: a dedicated `isApplying` on the assistant store, set before the loop and
cleared in a `finally`, plus an early return in `applyProposal` when it is already
set.

Both halves are needed. The flag is what the overlay renders from; the guard is
what makes duplication impossible even if a future layout change forgets to
disable the control. A disabled button is a UI promise; the guard is the invariant.

Alternative considered: reuse `isSending`. Rejected — the transcript auto-scroll
effect depends on `isSending`, so an apply would scroll the transcript, and the two
states mean different things to every other reader.

Alternative considered: read the cart store's `isMutating`. Rejected — that flag is
per cart call, so it flickers between rows of one apply rather than spanning it.

### The overlay clears on the loop, because the store is already authoritative

Each cart command awaits the API and then writes the cart the server returned
(`cartActions.cartUpdated(cart)`), rather than predicting the result. So the apply
loop resolving already means the cart in the store is the confirmed one, and
"clear the overlay once the backend confirms" needs no additional wait on SSE or a
refetch.

### Submission is reachable here, and the existing requirement does not forbid it

"Order submission stays human-only" constrains the assistant's operation set — no
operation submits, pays for, or closes an order. It says nothing about where the
guest's own submit action is rendered. A guest pressing submit inside the
assistant is that human action.

Reuse `feedbackCommands.confirm` and the existing submit command and navigation,
so there is one submission flow with one confirmation. Submitting navigates to the
order, which closes the assistant — correct, because the cart it was discussing no
longer exists.

The cart page's add-on handling (`submittedOrder.canAddOn` keeping the guest on
the cart) stays the cart page's concern; the assistant submits and leaves.

## Risks / Trade-offs

- **The panel grows into a layout component with two children.** → Keep the cart
  side as its own component taking already-derived props, so `AssistantPanel`
  stays composition plus the transcript it already owns.

- **Editing the cart from inside the assistant can contradict an open proposal.**
  A guest who removes an item that a pending proposal wants to update leaves a row
  that will fail on apply. → Already handled: the apply flow records a per-row
  failure with a reason and continues, and `not-found` is presented to the guest.
  No new handling, but it is a scenario the manual checks should cover.

- **Two scroll areas on a narrow viewport.** The cart overlay scrolls over a
  transcript that also scrolls. → The overlay covers the transcript rather than
  sitting beside it, so only one is scrollable at a time.

- **The transcript auto-scroll effect runs on `vm.proposal` changes.** Cart edits
  now also change state the panel reads. → The effect depends on transcript
  values, not cart state; keep cart data out of its dependency list so a quantity
  change does not yank the transcript to the bottom.

- **The overlay could outlive the work if a cart call never settles.** → The flag
  is cleared in a `finally`, so every exit path clears it, including a thrown
  error; the cart commands already map network failures to a returned result
  rather than hanging.

- **No component test environment in this workspace.** → The grouping function and
  any new render-shape derivation are pure and unit-tested; the layout itself goes
  on the manual check list in `docs/features/ai-ordering.md`.

## Migration Plan

Not applicable. No data, contract, or stored-state change; the only removal is one
i18n key and the line it rendered. The apply guard is a behavior fix with no state
to migrate: a guest mid-apply when the new build loads simply gets the guard.

## Open Questions

None.
