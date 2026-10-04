## Why

The assistant panel is a full-screen modal over the menu page, so while the
assistant is changing the cart the guest cannot see the cart change. The panel
even covers the menu page's own persistent cart bar, and the proposal card ends
with a hint telling the guest to go and check the cart — an instruction to leave
the conversation in order to verify what the conversation just did.

Verifying the result currently costs three navigations: close the assistant, open
the cart route, come back. That friction lands at the exact moment a guest is
deciding whether to trust the assistant, which makes it the first thing to fix.

## What Changes

- At the `md` breakpoint and up, the assistant becomes a two-column surface: the
  conversation on the left, the live cart on the right.
- Below `md`, a control inside the assistant opens the cart over the
  conversation; dismissing it returns to the conversation. The guest never leaves
  the assistant to see the cart.
- The in-assistant cart is editable — quantity changes and removal — so the guest
  does not have to leave in order to adjust what the assistant added.
- The cart shown is the guest's real cart, rendered from cart state, including
  other participants' read-only sections in a shared cart.
- Remove the `guest.assistant.proposalResultHint` string and the line it renders.
  Pointing at the cart is redundant once the cart is on screen.
- Applying a proposal blocks the assistant behind an overlay and a spinner until
  every cart call has returned, so the guest sees the cart settle rather than
  guessing whether it did. This also closes a defect: the apply flow sets no
  in-flight flag today, the Apply control is not disabled while it runs, and a
  second press repeats every operation against the cart.
- Submitting the order becomes reachable from inside the assistant, keeping the
  existing confirmation step. The assistant still has no operation that submits —
  the guest performs it, as they do on the cart page.

Deferred to a later change, deliberately out of scope here: dish photos or
product cards inside the conversation, a model-referenced product id on assistant
responses, and any rework that makes the conversation the primary ordering
surface.

## Capabilities

### New Capabilities

<!-- None. This changes how an existing capability is presented to the guest. -->

### Modified Capabilities

- `ai-ordering-assistant`: adds requirements that a guest can see and modify their
  cart without leaving the assistant conversation, that applying a proposal is
  blocked and non-repeatable until the cart has settled, and that the guest can
  submit from the assistant. No existing requirement is replaced or removed, and
  "Order submission stays human-only" is unaffected: it constrains the
  assistant's operation set, not where the guest's own submit action lives.

## Impact

Web only. No change to `packages/shared` contracts and no change to `apps/api`.

Affected code:

- `apps/web/src/pages/storeFront/menu/AssistantPanel.tsx` — layout becomes
  responsive and stops covering the cart.
- `apps/web/src/pages/storeFront/menu/AssistantProposalCard.tsx` — drops the
  result hint.
- `apps/web/src/pages/storeFront/menu/useAssistantPanelVM.ts` — exposes the cart
  data and the edit handlers the surface needs.
- `apps/web/src/pages/storeFront/menu/menuPage.commands.ts` — cart mutation
  commands reachable from the assistant surface.
- `apps/web/src/features/storeFront/aiOrdering/{store,actions,commands}.ts` — an
  apply-in-flight flag, and a guard that refuses a second concurrent apply.
- `apps/web/src/app/i18n/resources.ts` — new strings, one removal.

Reused rather than rebuilt:

- `features/storeFront/components/ParticipantOrderSection.tsx` and
  `OrderTotals.tsx` are already prop-driven with optional edit handlers.
- Cart state already lives in `runtime.stores.cart`, which the menu page already
  reads and the storefront SSE stream already keeps current, so no new load flow
  is introduced and a shared cart stays live.
- Cart commands write the cart the server returned, not an optimistic guess, so
  "the overlay clears once the update is confirmed" needs no new waiting
  mechanism — the apply loop resolving already means the store is authoritative.
- Submission is an existing confirm dialog, command, and navigation on the cart
  page; the assistant reuses all three.

Sequencing: the `ai-ordering-assistant` capability currently exists only as the
pending delta in the `add-ai-ordering-assistant` change. That change should be
archived before this one so the two deltas merge in order.
