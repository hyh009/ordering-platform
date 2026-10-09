Four slices in dependency order: shared contract, api, web, by hand. Each ends
with its own verification per `docs/agent/workflows/verification.md`.

Nothing from either earlier version is reused. `statedOptions`, `optionCarries`,
`AI_ORDERING_MAX_STATED_OPTIONS`, the sheet preselection, and the
`ask_which_product` tool with its `productQuestion` response type are all gone
on purpose — do not reintroduce any of them as part of this change.

## 1. Shared contract

- [ ] 1.1 Add the shown set's identifier to `aiOrderingProductsResponseSchema`
  in `packages/shared/src/contracts/aiOrdering.ts`, issued by the backend like
  `proposalId` is, so a pick has something to answer against
- [ ] 1.2 Add the request a pick sends: the shown set's identifier and the
  chosen product's identifier. Model it on `decideAiOrderingProposalSchema` —
  ids only, no content, so a caller can neither pick a product the set never
  presented nor alter what the assistant will be told
- [ ] 1.3 Add the shown set's settled state to whatever the client reads to
  know a set is no longer pickable, with the four cases distinguished (picked,
  answered in words, superseded, lapsed)
- [ ] 1.4 Verification: `pnpm --filter @repo/shared run build`

## 2. API — the interrupt

- [ ] 2.1 In `runtime/agent.ts`, stop `planningMiddleware` discarding
  `show_products`'s tool call. Rewrite it to a hydrated call the way the
  proposal's already is, with the backend-issued set id as the tool call id, so
  the interrupt, the client and the tool all read one set of ids. Its stub body
  `async () => ''` stays as it is — that is where the resume lands
- [ ] 2.2 Add it to `humanInTheLoopMiddleware({ interruptOn })` beside
  `AI_ORDERING_PROPOSAL_TOOL`. On its own this does nothing, which is worth
  knowing while reading the diff: the middleware interrupts on a PENDING tool
  call, so 2.1 is what makes 2.2 take effect. Leave `ask_choices` and
  `report_unanswerable` discarded as they are — only the two tools the guest
  acts on interrupt
- [ ] 2.3 Leave the middleware ORDER alone and say so in the commit: planning is
  listed after the interrupt precisely so its rewrite happens first. The
  existing comment explains it and is now load-bearing for a second tool
- [ ] 2.4 Update the comment that currently explains why non-proposal responses
  must NOT reach a tool node, and the `answerTools` doc comment that calls them
  output-channel tools where nothing executes — `show_products` stops being one. It is the reasoning being inverted, so it should
  say what is now true and why, not be deleted
- [ ] 2.5 Verification: the existing interrupt tests pin the runtime shape of
  the middleware; extend them to cover two interrupting tools

## 3. API — resume, storage, context

- [ ] 3.1 Add the shown-set snapshot to `AiOrderingTurnSnapshot` in
  `models/aiOrdering/model.ts`, beside `prompt?` and `proposal?`: the set id and
  the product ids presented. Say in the comment why it exists — resolving the
  pick against the guest's own conversation is what makes another guest's set
  unreachable (design decision 5)
- [ ] 3.2 Add its decision record, with the four cases named rather than
  inferred from absence, reusing the wording the proposal decision established
  for `superseded` (design decision 6)
- [ ] 3.3 Accept a pick: validate the set id belongs to this guest's
  conversation and is unsettled, validate the product id against the STORED set
  and not the live menu, then resume the paused run with the product as the tool
  result
- [ ] 3.4 Record the resumed run's response as a NEW turn, linked to the shown
  set it answers (design decision 4). Do not make `response` a list
- [ ] 3.5 Settle a standing shown set as superseded when the guest sends a
  message instead, releasing the paused run, through the path that already
  supersedes a proposal
- [ ] 3.6 Refuse a second pick on a settled set with a distinguishable reason,
  the way a second decision on a proposal is refused — "already answered" and
  "lapsed" must stay separable
- [ ] 3.7 Render a picked product into the resumed call's context the way an
  answered choice already is, so the model sees which set it answers and which
  product by code and name
- [ ] 3.8 Print the shown set and the pick on the replay outcome line
- [ ] 3.9 Regression case: `我要蛋餅加雞塊` against the twelve-crepe fixture
  expects a shown set of all twelve with nothing proposed, and the reply asking
  which one. Pin that `蛋餅有哪幾種` still answers with the same response type —
  the two must stay one path
- [ ] 3.10 Regression case for the resume: with the pick supplied as the tool
  result, the next model call proposes the chosen crepe WITH the nugget, from
  context alone and with no option field (design decision 9)
- [ ] 3.11 Verification: `pnpm --filter api test`, typecheck, lint, and a replay
  run of the new cases plus the full `--suite regression` once the daily model
  quota allows. Record before/after; the standing baseline is 19 of 20 at
  fingerprint `bc0d9296179a`

## 3b. API — the closing sentence

- [ ] 3b.1 Remove the `beforeModel` / `canJumpTo: ['end']` hook added in
  `cf3777f` from `planningMiddleware`, so a decided run calls the model again
  whether or not anything failed (design decision 13). Keep the `wrapModelCall`
  behaviour that binds NO tools on the closing call — a second proposal inside a
  decided run is still exactly what must not happen
- [ ] 3b.2 Leave the service's `last?.getType() === 'ai'` guard in place. It
  stops being load-bearing once every decided run ends on an AI message, but it
  is correct and cheap, and it keeps a run that ends at the tool from handing the
  guest a line of `operationId: outcome`
- [ ] 3b.3 Store the closing sentence on `AiOrderingProposalDecision` in
  `models/aiOrdering/model.ts`, beside `results` and `appliedOperations`.
  Without it a reload keeps the row statuses and loses the explanation (design
  decision 14)
- [ ] 3b.4 Return it on the guest's restored transcript, so a reloaded
  conversation reads the same as the live one
- [ ] 3b.5 Report the dismissed operations to the model without executing them
  (design decision 17): pass the dismissed set to `createAiOrderingAgent` beside
  the executor, and have the proposal tool's returned result name every
  operation in the proposal with its outcome. The tool still EXECUTES only what
  it is given in `operations`
- [ ] 3b.6 Rewrite the `resumeProposal` comment that says the closing sentence
  is not rendered. Keep its conclusion — `6914fef` still holds — and change its
  reason (design decision 18)
- [ ] 3b.7 Test the three speaking cases for what the model is TOLD, not only
  that it was called: all accepted, a kept subset where the dismissed row is
  still named as rejected, and a failure carrying its `failureCode`
- [ ] 3b.8 Leave the two silent cases silent, and pin each with a test:
  dismissing every operation still makes no cart call and no model call, and a
  guest who types instead still settles the proposal as `superseded` with the
  model told on the next turn (design decision 15)
- [ ] 3b.9 Restore the closing-call tests that `cf3777f` rewrote to run against
  a failed operation only. Three outcomes call the model now — all accepted, a
  kept subset all accepted, and a failure — so each is worth a case, and pin
  that the closing call is bound no tools
- [ ] 3b.10 Verification: `pnpm --filter api test`, typecheck, lint

## 4. Web

- [ ] 4.1 Carry the shown set's id and settled state through
  `src/models/aiOrdering` like every other field — no raw DTO past the model
  layer
- [ ] 4.2 Change the card's tap in the assistant panel from opening the
  configuration sheet to sending the pick. Remove the panel's route into
  `ProductConfigSheet`; the menu grid's route is untouched (design decision 8)
- [ ] 4.3 Wire the pick through the page VM so it shares the pending state a
  sent message has: the panel shows the assistant working, and a second tap
  cannot start a second resume
- [ ] 4.4 Make a settled set's cards untappable with its reason shown: picked
  from, answered in words, superseded, lapsed, store shut, or the product sold
  out (design decision 10)
- [ ] 4.5 Keep the composer usable while a set is standing, so a typed answer
  still works, and pin it in a test
- [ ] 4.6 Tests: a tap sends one pick carrying the set id and the product id; a
  second tap does nothing; a settled set is untappable; a typed message while a
  set stands settles it in the view
- [ ] 4.7 Render the decision's `reply`, which the storefront drops today:
  `commands.ts` passes only `results` and `appliedSummaries` to
  `proposalDecided`, and the action takes no third argument. Carry it through
  the action and the store, and show it in the transcript as the assistant's
  word on what became of the proposal (design decision 14)
- [ ] 4.8 Show it on a restored transcript too, from the stored decision, so a
  reload does not keep the row statuses and lose the sentence
- [ ] 4.9 Tests: a decision carrying a reply renders it; a decision without one
  renders nothing extra; a reload shows the stored sentence
- [ ] 4.10 Verification: `pnpm --filter web test`, typecheck, lint, and the
  frontend architecture validation guide

## 5. By hand

- [ ] 5.1 Against a store with a twelve-product category and a shared add-on
  modifier: ask for the dish with the add-on, confirm all twelve are shown with
  the assistant asking which, tap one, confirm a proposal arrives carrying the
  add-on, set a choice on the proposal card, confirm it, and confirm the cart
  line matches
- [ ] 5.2 Tap a kind that does not offer the stated add-on, and confirm the
  assistant says so rather than proposing something the product cannot carry
- [ ] 5.3 Ask `蛋餅有哪幾種`, tap a card, and confirm the browse case now also
  goes through the proposal card. Note how much slower it feels than today —
  this is the cost design decision 8 accepted, and it is worth seeing
- [ ] 5.4 Answer a shown set by typing, and confirm it is understood and the
  cards stop being tappable
- [ ] 5.5 Show products, reload the page, and confirm the set comes back with
  its real state: still pickable if nothing settled it, and not pickable with a
  reason if something did
- [ ] 5.6 Accept a proposal whose operations all succeed, and confirm the
  assistant now says what it did. Note how much slower the tap feels than
  before — this is what design decision 13 gave up, and it is worth seeing
- [ ] 5.7 Accept a proposal with one operation that fails, and confirm the
  sentence explains what the row statuses cannot — then reload and confirm the
  sentence is still there
