Three slices in dependency order: shared contracts, api, web. Each ends with its
verification step per `docs/agent/workflows/verification.md`.

## 1. Shared contracts

- [x] 1.1 Add the proposal decision request schema (proposal id plus the kept
  operation ids, the ids bounded by the existing per-proposal operation maximum)
  and its success response (per-operation results, the resulting cart, and the
  assistant reply) to `packages/shared/src/contracts/aiOrdering.ts`, exporting
  them per `docs/agent/workflows/shared-contracts.md`; verify the kept ids are
  validated as ids only and that the request carries no operation content
- [x] 1.2 Remove `previousOutcome` from `sendAiOrderingMessageSchema` and remove
  `aiOrderingPreviousOutcomeSchema` if nothing else references it, keeping
  `aiOrderingOperationResultSchema` untouched; verify by type-check that no
  producer or consumer of the removed field remains
  (`grep -rn "previousOutcome" apps packages`)
- [x] 1.3 Add the error codes the decision endpoint needs — already decided,
  expired, unknown proposal — to the shared error code list; verify each is
  distinct so "already decided" and "expired" never collapse into one code
- [x] 1.4 Verify the shared slice: `pnpm --filter @repo/shared run build` and
  `pnpm --filter @repo/shared run test` if present, plus
  `pnpm --filter api run build` to surface every call site the removal breaks

## 2. Persistence and the applied marker

- [x] 2.1 Extend `AiOrderingProposalSnapshot` in
  `apps/api/src/models/aiOrdering/model.ts` with the decision record (decided-at
  timestamp and per-operation results), replacing the "deliberately no status
  field" comment with the reason there is one now; mirror it in `mongo.ts` per
  `docs/agent/backend/mongo-schema.md`; verify the contract test covering the
  stored shape is extended rather than loosened
- [x] 2.2 Add a repository method that records a proposal's decision only when no
  decision is recorded yet, returning whether it won, per
  `docs/agent/backend/repository.md`; verify a test issues two concurrent calls
  for one proposal and exactly one wins
- [x] 2.3 Add a repository read that returns a proposal snapshot by proposal id
  within the caller's conversation; verify a test shows another participant's or
  another cart's proposal id is not found rather than returned

## 3. The agent run

- [x] 3.1 Add `langchain`, `@langchain/langgraph`, and the MongoDB checkpoint
  saver to `apps/api/package.json`; verify the install succeeds and
  `pnpm --filter api run build` passes with no other change
- [x] 3.2 Configure the checkpoint collection with a 24-hour TTL and wire it into
  the runtime, keeping it out of `models/` and `repositories/` per design
  decision 7; verify the existing Mongo index test is extended to pin the TTL
  index
- [x] 3.3 Convert `propose_cart_operations` in
  `apps/api/src/modules/aiOrdering/tools.ts` into an executing tool that calls
  `guestOrdering.service` for each operation under the guest's own claims,
  attempting them in the proposed order and returning a result per operation;
  verify a test shows a failure at the second of three leaves the first in the
  cart and marks the third unattempted
- [x] 3.4 Map cart service errors onto stable per-operation reason codes per
  `docs/agent/backend/throwing-errors.md`; verify an exhaustive mapping test so a
  new cart error cannot reach a guest as an unlabelled failure
- [x] 3.5 Build the run with `createAgent` and
  `humanInTheLoopMiddleware({ interruptOn: { propose_cart_operations: { allowedDecisions: ["approve", "edit", "reject"] } } })`,
  with the thread id set to the proposal id; verify a test using LangChain's fake
  model shows a proposal tool call pauses the run without touching the cart
- [x] 3.6 Move the output gate, validation, and the single repair retry into
  middleware that runs before the human-in-the-loop middleware, keeping
  `outputGate.ts`, `validation.ts`, and `modelResponse.ts` and their tests;
  verify a test shows a proposal failing validation never becomes an interrupt
- [x] 3.7 Collect the existing quality signals from that middleware; verify the
  signals test still covers repair attempted, repair succeeded, dropped
  operations, ownership violations, and cached prompt tokens
- [x] 3.8 Delete `planner.ts` and its `AiOrderingModelCaller` seam once nothing
  references them; verify `pnpm --filter api run build` passes and no test still
  stubs the removed seam
- [x] 3.9 Pin the assembled message order against the fake model's recorded
  messages so the cache prefix of `add-ai-ordering-assistant` decision 15 cannot
  be reordered silently; verify the test fails when a middleware is made to
  inject ahead of the system instruction

## 4. The decision endpoint

- [x] 4.1 Add a service method that claims the decision atomically (task 2.2),
  rebuilds the edited tool arguments from the stored snapshot keeping only the
  named operation ids, resumes the run with a `Command`, records the results and
  the assistant reply on the proposing turn, and returns them with the resulting
  cart; verify a test shows an operation id absent from the stored snapshot is
  rejected rather than executed
- [x] 4.2 Record dismissed operations as `rejected` and operations that were
  never attempted distinctly from failures, so every operation in the proposal
  carries a result; verify a test asserts the result count equals the proposal's
  operation count in the partial-failure case
- [x] 4.3 Refuse a second decision for the same proposal with the already-decided
  code, executing nothing and leaving the recorded outcome unchanged; verify a
  test sends the same decision twice and asserts one execution
- [x] 4.4 Treat a proposal with no resumable run as expired, recording its
  operations as `no_action` and refusing with the expired code; verify a test
  distinguishes the expired response from the already-decided one
- [x] 4.5 Add the route under `apps/api/src/routes/v1/public/guest/aiOrdering.ts`
  behind `requireGuest`, with the same rate limit, concurrency refusal, and
  store-open and cart-active checks as the chat route but exempt from the
  conversation turn ceiling, per `docs/agent/backend/route-development.md`;
  verify route tests cover each refusal
- [x] 4.6 Document the route with OpenAPI JSDoc per
  `docs/agent/backend/swagger.md`; verify the generated spec includes the new
  route and its error codes
- [x] 4.7 Extend the guest conversation read so a restored transcript carries
  each proposal's recorded state — decided with results, or pending and
  unexpired — without exposing anything the guest should not see per
  `docs/agent/frontend/model-dto-boundary.md`; verify a test covers the applied,
  partially applied, and still-pending cases
- [x] 4.8 Remove the `previousOutcome` handling from `promptResolution.ts` and
  the send path, and remove `reportedOutcomes` from the stored turn — there is no
  deployed data holding one, so nothing needs to stay readable; point the summary
  and merchant review at the proposal snapshot's recorded results instead; verify
  their tests assert the same aggregate outcomes from the new source
- [x] 4.9 Verify the api slice: `pnpm --filter api run lint`,
  `pnpm --filter api run build`, and `pnpm --filter api run test`, confirming the
  suite still runs with the AI env vars blank and reaches no provider

## 5. The web surface

- [x] 5.1 Add the decision call to
  `apps/web/src/services/storeFrontAiOrdering.service.ts` and its model mapping
  per `docs/agent/frontend/model-dto-boundary.md`; verify no raw DTO escapes
  `src/models/aiOrdering`
- [x] 5.2 Replace `applyProposal` in
  `apps/web/src/features/storeFront/aiOrdering/commands.ts` with one call that
  sends the kept operation ids and writes the server's results onto the rows,
  deleting `APPLY_FAILURE_SCOPE`, `runCartOperation`, the retry path, and the
  client-side outcome accumulation per `docs/agent/frontend/commands.md`; verify
  the existing apply tests are rewritten against the single call and that a
  second apply is still refused
- [x] 5.3 Update the store and actions so a decided proposal carries the server's
  per-operation results and the cart from the same response, dropping the locally
  accumulated outcome state per `docs/agent/frontend/state-ownership.md`; verify
  a test shows the cart store is updated from the decision response rather than
  by a separate read
- [x] 5.4 Remove the `stale` record from
  `apps/web/src/pages/storeFront/menu/assistantPanelView.ts` and derive each
  proposal's presentation from the state the server recorded, keeping
  `FAILURE_KIND_BY_REASON`; verify unit tests cover the applied, partially
  applied, and still-pending cases and that no copy of the old hint text remains
- [x] 5.5 Remove the per-operation retry control from `AssistantProposalCard.tsx`
  and the strings it used from both locales in
  `apps/web/src/app/i18n/resources.ts`, adding any new strings with English
  defaults per `docs/agent/frontend/i18n.md`; verify
  `pnpm --filter web run i18n:scan` lists the additions and none of the removals
- [x] 5.6 Keep the apply overlay, clearing it when the decision response returns;
  verify the view still exposes an apply-in-progress value distinct from
  `isSending` and that a test asserts both independently
- [x] 5.7 Verify the web slice: `pnpm --filter web run lint`,
  `pnpm --filter web run build`, `pnpm --filter web run test`, and
  `pnpm --filter web run i18n:scan`, then walk
  `docs/agent/frontend/architecture-validation.md`

## 6. Documentation and whole-system verification

- [x] 6.1 Update `docs/features/ai-ordering.md`: the backend now executes an
  accepted proposal, a proposal is single-use with a bounded lifetime, outcomes
  are recorded when they happen, and the assistant answers a failure in the same
  exchange; remove the sections describing the client-side apply loop and the
  stale record, per `docs/agent/workflows/feature-docs.md`
- [x] 6.2 Add manual checks a browser is needed for: accepting a full proposal,
  dismissing one operation and accepting the rest, a proposal that partially
  fails, accepting twice by double submission, reloading after accepting,
  reloading with a proposal still pending, and letting a proposal expire
- [x] 6.3 Verify the whole workspace: `pnpm run lint`, `pnpm run build`, and
  `pnpm run test`, confirming no test reaches a provider and no AI env var is
  required to run the suite
