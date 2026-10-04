Web only. There is no shared-contract or api slice in this change.

## 1. Make the cart grouping reusable

- [x] 1.1 Add a pure `groupCartItemsByParticipant(cart, currentParticipantId)` to
  `apps/web/src/models/cart`, returning `{ participant, items, isCurrentUser }[]`
  in `cart.participants` order with empty buckets preserved; verify new unit tests
  cover an item whose `addedByParticipantId` is missing, a participant with no
  items, and `isCurrentUser` being true for exactly one participant
- [x] 1.2 Replace the inline `participantGroups` derivation in
  `apps/web/src/pages/storeFront/cart/useCartPageVM.ts` with a call to it; verify
  the existing cart page tests still pass and no second copy of the grouping
  remains (`grep -rn "addedByParticipantId" apps/web/src`)

## 2. Expose cart data and edit handlers to the assistant

- [x] 2.1 Add `updateCartItem` and `removeCartItem` to
  `apps/web/src/pages/storeFront/menu/menuPage.commands.ts`, delegating to
  `runtime.commands.cart`; verify by type-check that they return the same result
  type the apply flow already handles
- [x] 2.2 Extend `useAssistantPanelVM` with the cart participant groups, totals,
  `isMutating`, and quantity-change / remove handlers that present failures through
  `handleStoreFrontFailure`; verify the handlers are stable (`useCallback`) so the
  transcript auto-scroll effect's dependencies are unaffected
- [x] 2.3 Keep cart values out of the transcript auto-scroll effect's dependency
  list; verify by reading the effect that a quantity change cannot scroll the
  transcript

## 3. Block the apply until the cart has settled

- [x] 3.1 Add `isApplying` to the assistant store with `applyStarted` /
  `applyFinished` actions; verify a unit test shows `isSending` is untouched by
  them, so the transcript auto-scroll effect is unaffected
- [x] 3.2 Set the flag around `applyProposal`'s loop, clearing it in a `finally`,
  and return early when it is already set; verify tests cover that two concurrent
  applies send each operation to the cart exactly once, and that the flag is
  cleared after a row failure, after a session-scoped abort, and after a thrown
  error
- [x] 3.3 Render an overlay with a spinner over the assistant while `isApplying`,
  and stop passing `isSending` as `isApplying` to the proposal card; verify the
  view exposes an apply-in-progress value distinct from `isSending` and that a unit
  test asserts both independently
- [x] 3.4 Verify the overlay clears only after every cart call has returned, by
  asserting the view's apply-in-progress value is false exactly when
  `applyProposal` resolves

## 4. Build the responsive surface

- [x] 4.1 Add an `AssistantCartPanel` component that renders
  `ParticipantOrderSection` per group — edit handlers passed only for
  `isCurrentUser` — plus `OrderTotals`, and an empty state when the cart has no
  items; verify other participants' sections render without edit controls
- [x] 4.2 Widen `AssistantPanel` and render the conversation and
  `AssistantCartPanel` as two columns at `md` and up (`hidden md:block` for the
  cart column); verify the conversation keeps its own scroll area and the panel
  still fits `max-h-[85vh]`
- [x] 4.3 Below `md`, add a component-local cart-visibility toggle and render
  `AssistantCartPanel` over the conversation inside the panel's own stacking
  context (`md:hidden`); verify no new z-index token was added to
  `apps/web/src/styles/global.css` and that a toast still renders above the overlay
- [x] 4.4 Verify dismissing the mobile cart returns to the conversation with its
  transcript and any open proposal intact, and that the toggle state is inert at
  `md` and up

## 5. Submit from the assistant

- [x] 5.1 Add a submit handler to `useAssistantPanelVM` that reuses
  `feedbackCommands.confirm` and the existing submit command, navigating to the
  order on success and presenting failures through `handleStoreFrontFailure`;
  verify declining the confirmation submits nothing
- [x] 5.2 Render the submit action in the assistant cart, disabled while the cart
  is empty or an apply is in flight; verify the confirmation copy matches the cart
  page's so there is one submission wording
- [x] 5.3 Verify no assistant operation or prompt change was introduced, keeping
  "Order submission stays human-only" intact (`grep -rn "submit" apps/api/src/modules/aiOrdering` returns no new operation)

## 6. Remove the redundant hint

- [x] 6.1 Delete the `proposalResultHint` line from
  `AssistantProposalCard.tsx` and the `guest.assistant.proposalResultHint` key
  from both locales in `apps/web/src/app/i18n/resources.ts`; verify
  `pnpm --filter web run i18n:scan` no longer lists the key and no reference
  remains (`grep -rn "proposalResultHint" apps/web/src`)
- [x] 6.2 Add the new strings for the cart toggle and the assistant cart's empty
  state to both locales with English defaults per
  `docs/agent/frontend/i18n.md`; verify `i18n:scan` lists them

## 7. Documentation and verification

- [x] 7.1 Update `docs/features/ai-ordering.md`: replace the claim that the guest
  is pointed at the cart, describe the two layouts, document the apply overlay and
  the guard behind it, and add manual checks for the side-by-side cart, the mobile
  open/dismiss round trip, a shared-cart section staying read-only, editing an item
  whose row a pending proposal still references, the overlay appearing and clearing
  on apply, and submitting from the assistant
- [x] 7.2 Run the web slice verification per
  `docs/agent/workflows/verification.md`: `pnpm --filter web run lint`,
  `pnpm --filter web run build`, `pnpm --filter web run test`, and
  `pnpm --filter web run i18n:scan`
- [x] 7.3 Walk `docs/agent/frontend/architecture-validation.md`, confirming the
  view calls only VM handlers, the visibility toggle stayed component-local, and
  the cart mutation path goes through page commands rather than the view
