## 1. Shared Contracts

- [x] 1.1 Add the AI ordering contract module in `packages/shared` with the turn request schema (message, optional prompt response fields, optional previous-outcome report) and the response union of `message` / `choices` / `proposal` / `unanswered`, and verify `pnpm --filter shared run build` emits the new types
- [x] 1.2 Derive proposal operation payloads from the existing cart request schemas per design decision 17 (`add_item` from the add-item request, `update_own_item` from the update request plus the existing item id, `remove_own_item` from the item id alone) and verify a contract test in `apps/api/tests/aiOrdering.contract.test.ts` fails when an operation field drifts from the cart schema
- [x] 1.3 Declare `type` as the first property of every response variant with explicit property ordering per design decision 13, and verify the property order in `apps/api/tests/aiOrdering.contract.test.ts`
- [x] 1.4 Add the per-operation outcome report values (`accepted`, `rejected`, `no_action`, `failed`) and verify `apps/api/tests/aiOrdering.contract.test.ts` rejects an unknown outcome value
- [x] 1.5 Add the store-level automatic-application setting to the existing store contract and its update schema as an optional field, and verify the existing store contract tests still pass
- [x] 1.6 Run the shared slice verification: `pnpm --filter shared run build`, `pnpm --filter api run test` (the contract tests live under `apps/api/tests` because `packages/shared` has no test runner), and `pnpm run lint`

## 2. API Persistence

- [x] 2.1 Establish the backend test layout per `docs/agent/backend/api-testing.md` (supertest, integration) and `docs/agent/backend/unit-testing.md` (vitest, no supertest for pure units): every test flat under `apps/api/tests` as `.test.ts`, shared setup in `tests/setup`, frozen fixtures in `tests/fixtures`, named `aiOrdering.<unit>.test.ts` per unit (`contract`, `conversation.mongo`, `repository`, `versions`, `context`, `outputGate`, `validation`, `repair`, `confirmationMode`, `history`, `runtime`, `service`, `merchant`) plus `aiOrdering.test.ts` for the route suite, and verify no test file lands inside `apps/api/src`
- [x] 2.2 Add `models/aiOrdering/model.ts` with the conversation entity, turn snapshot, and turn ceiling constant, and verify it imports no mongoose (per `docs/agent/backend/mongo-schema.md`)
- [x] 2.3 Add `models/aiOrdering/mongo.ts` with the schema, timestamps, and the two approved indexes — unique `{ storeId, cartId, participantId }` and `{ storeId, createdAt: -1 }` — with NO TTL index, and verify the index assertions in the existing `mongoSchemaIndexes.test.ts`
- [x] 2.4 Add `repositories/aiOrdering/` with the repository contract and mongo implementation covering find-by-participant, create, and append-turn, and verify `aiOrdering.repository.test.ts` shows append-turn refusing once the turn ceiling is reached rather than dropping stored turns
- [x] 2.5 Run the persistence verification: `pnpm --filter api run test` for the new model and repository tests

## 3. API Assistant Module

- [x] 3.1 Add the version registry under `modules/aiOrdering/versions/` with one config file for the first version, carrying its prompt, limits, and whether it permits automatic application, and verify an unknown version id resolves to the documented fallback instead of throwing
- [x] 3.2 Add the core system prompt as versioned code, separate from store data, per design decision 9, and verify the assembled prompt contains no store-specific text
- [x] 3.3 Implement context assembly ordered by volatility per design decision 15 (core instruction, then store menu and information as a delimited data block, then history, then the current turn's cart snapshot and message) and verify a test asserts the block order and that the cart snapshot is last
- [x] 3.4 Assemble the cart context with the guest's own modifiable items listed separately from other participants' read-only items per design decision 7, and verify a test with a two-participant cart fixture shows the split
- [x] 3.5 Implement the output gate: parse the model output against the response schema and reject anything that does not match, and verify tests cover a missing type, an unknown field shape, and an over-length reply
- [x] 3.6 Implement the four validation checks against menu and cart data (product exists, not sold out, modifier selections valid and available, operation targets the guest's own item) and verify one test per check using a frozen menu and cart fixture
- [x] 3.7 Implement the single repair retry: on validation failure feed the failing operations and reasons back for exactly one more attempt, then drop the offending operations and degrade to a non-proposal response, and verify a test asserts at most two model calls occur
- [x] 3.8 Record repair frequency, post-repair failure, and ownership-violation counts per turn as version quality signals, and verify they appear on the stored turn
- [x] 3.9 Resolve the effective confirmation mode as the AND of the store setting and the version's permission per design decision 6, and verify tests cover both enabled, store-only enabled, and neither
- [x] 3.10 Implement history windowing with the rolling summary for context only, keeping every turn stored, and verify a test shows a long conversation sends a bounded context while the stored turn count is unchanged
- [x] 3.11 Resolve a prior choice prompt and a previous-outcome report into model-visible context, distinguishing `rejected` from `no_action`, and verify a test asserts the two produce different context
- [x] 3.12 Run the module verification: `pnpm --filter api run test` for the module unit tests

## 4. API Provider Runtime

- [x] 4.1 Add the LangChain and Google GenAI dependencies and verify `pnpm install` succeeds and the lockfile updates
- [x] 4.2 Add `GEMINI_API_KEY` (optional), the model name, and the active version id to `config/env.ts`, update `apps/api/.env.example` and `apps/api/tests/setup/env.ts`, and verify the API still boots with all three unset
- [x] 4.3 Implement the provider runtime through LangChain's `ChatGoogleGenerativeAI` with structured output per design decision 14, and verify a test with a stubbed model returns a parsed response without calling the network
- [x] 4.4 Make version selection explicit: an unset version id disables the assistant, and a key present in the environment must never by itself route traffic to the provider, and verify a test asserts the disabled default
- [x] 4.5 Record the provider's cache-read token count on each stored turn per design decision 15, and verify a test with stubbed usage metadata stores the value
- [x] 4.6 Map provider failures (timeout, rate limited, unavailable, content filtered, unknown) to stable internal reasons without leaking raw provider errors, and verify one test per mapped class
- [x] 4.7 Run the runtime verification: `pnpm --filter api run test` and `pnpm --filter api run build`

## 5. API Guest Endpoint

- [x] 5.1 Add `services/aiOrdering.service.ts` orchestrating load, plan, gate, validate, repair, persist, and respond, with the repository and grounding dependencies injectable, and verify service unit tests run without a live database
- [x] 5.2 Add the guest route under `routes/v1/public/guest/` behind the guest token and open-store middleware, keeping the handler thin per `docs/agent/backend/route-development.md`, and verify integration tests cover 401 without a token, 400 on an empty message, and 400 over the length limit
- [x] 5.3 Enforce the request limits from design decision 16 (10 requests per minute per guest token, one in-flight request, 50 turns per conversation) refusing before any model call, and verify one test per limit
- [x] 5.4 Persist every turn including gate-rejected output and degraded responses, and return a stable failure response when the conversation write fails, and verify tests cover both
- [x] 5.5 Rebuild the rolling summary from the ORIGINAL stored turns — never by summarising the previous summary — batched so it runs once per N turns aged out of the window rather than on every turn past it, with N carried on the version config; expose the turns to summarise as a returned slice starting at turn index 0 so a summary-of-a-summary is not reachable, and verify a test asserts the summarisation input starts at index 0 and that no rebuild happens until N turns have aged out
- [x] 5.6 Add the OpenAPI definitions for the new route per `docs/agent/backend/swagger.md` and verify the swagger build output includes it
- [x] 5.7 Run the guest endpoint verification: `pnpm --filter api run test`, `pnpm --filter api run lint`, `pnpm --filter api run build`

## 6. API Merchant Read

- [ ] 6.1 Add merchant routes under `routes/v1/merchant/` to list and read a store's conversations, scoped to the requesting user's authorization per `docs/features/permissions.md`, and verify a test asserts another store's conversations are refused
- [ ] 6.2 Add the unanswered-question listing, surfacing the reason and the product it concerned when the reason is missing product information, and verify a test returns entries for a conversation containing an `unanswered` turn
- [ ] 6.3 Add the conversation mapper in `models/aiOrdering/mapper.ts` so the merchant response exposes DTOs rather than raw entities, and verify no internal field appears in the response test
- [ ] 6.4 Add the store setting to the existing store update path so a merchant can toggle automatic application, and verify an update test round-trips the field
- [ ] 6.5 Run the merchant slice verification: `pnpm --filter api run test`, `pnpm --filter api run lint`, `pnpm --filter api run build`

## 7. Web Models And Service

- [ ] 7.1 Add `src/models/aiOrdering/` re-exporting the shared contract types and deserializing responses into frontend models per `docs/agent/frontend/model-dto-boundary.md`, and verify a deserialize test maps every response type
- [ ] 7.2 Add the assistant service calling the guest endpoint and returning models rather than DTOs, and verify an API error test covers the typed failure path per `docs/agent/frontend/api-error-testing.md`
- [ ] 7.3 Add a mapper from a proposal operation to the existing cart request shape, and verify a unit test covers all three operation types
- [ ] 7.4 Run the web model slice verification: `pnpm --filter web run test` and `pnpm --filter web run lint`

## 8. Web Storefront Assistant

- [ ] 8.1 Add the assistant feature store holding conversation turns and pending-proposal state per `docs/agent/frontend/state-ownership.md`, and verify the store holds state only with no async logic
- [ ] 8.2 Add feature actions mutating that store, and verify action unit tests cover appending a turn and expiring a pending proposal
- [ ] 8.3 Add the send-message command wiring outcome reporting into the next request, and verify a command test asserts the previous outcome is attached
- [ ] 8.4 Add the apply command executing remaining operations through the EXISTING cart commands in order, collecting a per-operation result, and verify a test with a stubbed cart service covers all succeeding, and the second of three failing
- [ ] 8.5 Implement proposal expiry on sending a new message and on a newer assistant response, reporting the operations as `no_action`, and verify a command test distinguishes it from a dismissal
- [ ] 8.6 Add the page VM hook owning the panel's flow state and command-result reactions per `docs/agent/frontend/state-ownership.md`, and verify no view reads the store or calls commands directly
- [ ] 8.7 Add the chat panel view rendering the four response types from VM-provided state, with `choices` always allowing free text, and verify a VM test exposes a render-ready shape for each of the four types — assert on VM state, not on rendered output, since the web workspace has no component-test environment; the visual check is listed in 11.4
- [ ] 8.8 Add the proposal card as a per-operation list with an individual dismiss control per row, a single apply action, and a per-operation result display after applying, and verify a VM test asserts the apply action is reported unavailable once every row has been dismissed
- [ ] 8.9 Apply validated operations without confirmation controls when the resolved mode allows it, and verify a VM test asserts confirmation controls are reported as not required in that mode only
- [ ] 8.10 Present command failures through the storefront failure helper per `docs/agent/frontend/error-feedback.md`, and verify the existing failure-routing test covers the new failures
- [ ] 8.11 Hide the assistant entry point entirely when the assistant is not enabled, and verify a VM test asserts the entry-point flag is false in that case
- [ ] 8.12 Add English-default i18n keys for all new strings per `docs/agent/frontend/i18n.md`, and verify `pnpm --filter web run lint` passes the i18n key scan
- [ ] 8.13 Run the storefront slice verification: `pnpm --filter web run test`, `pnpm --filter web run lint`, `pnpm --filter web run build`, and the checklist in `docs/agent/frontend/architecture-validation.md`

## 9. Web Merchant Review

- [ ] 9.1 Add the merchant conversation list page with its VM and commands following the existing merchant list pages, and verify it paginates per `docs/agent/frontend/pagination.md`
- [ ] 9.2 Add the conversation detail view showing each turn and its response type, and verify a VM test exposes a turn list that includes a gate-rejected turn (visual check in 11.4)
- [ ] 9.3 Add the unanswered-question list view, and verify a VM test exposes the product reference on entries whose reason identifies one (visual check in 11.4)
- [ ] 9.4 Add the automatic-application toggle to the store settings page following `docs/agent/frontend/forms.md`, and verify the form saves and reloads the value
- [ ] 9.5 Run the merchant web slice verification: `pnpm --filter web run test`, `pnpm --filter web run lint`, `pnpm --filter web run build`, and the checklist in `docs/agent/frontend/architecture-validation.md`

## 10. Replay Tooling

- [ ] 10.1 Add the frozen menu and cart fixture covering a sold-out product, a sold-out modifier option, required and optional modifiers, a product with no modifiers, and several similarly named products, and verify the module tests already written consume it
- [ ] 10.2 Add the replay script running stored guest messages against a chosen version and model over the frozen fixture, and verify it produces a comparison output for two version ids without writing to the database
- [ ] 10.3 Run the tooling verification: `pnpm --filter api run test` and `pnpm --filter api run lint`

## 11. Documentation

- [ ] 11.1 Add `docs/features/ai-ordering.md` per `docs/agent/workflows/feature-docs.md` with the code map, turn contract, version and replay workflow, and the responsibility split between backend proposal and frontend execution, and verify it names no file that does not exist
- [ ] 11.2 Register the feature in `docs/features/index.yaml` and verify the entry resolves to the new file
- [ ] 11.3 Update `docs/schema/mongo.md` with the conversation model, its relationships, and its two indexes per `docs/agent/backend/mongo-schema.md`, and verify the diagram renders
- [ ] 11.4 Run the full verification per `docs/agent/workflows/verification.md`: `pnpm run lint`, `pnpm run test`, `pnpm run build`, and list the manual checks that still need a browser, which carry every assertion the web workspace cannot make without a component-test environment: the chat panel rendering each of the four response types, the proposal card's per-row dismiss and single apply, the per-operation result display after a partial failure, automatic-application mode showing no confirmation controls, the assistant entry point being absent when disabled, and the merchant review pages

## 12. Tool-Call Transport

Supersedes the transport chosen in groups 3 and 4 per design decision 2. Those
tasks were completed as specified and stay checked; this group carries the
migration from a JSON response schema to bound tools.

- [x] 12.1 Define the assistant's tools (`propose_cart_operations`, `ask_choice`, `report_unanswerable`) with the existing model-facing schemas as their argument schemas, so the narrowed model contract of design decision 18 is preserved rather than rewritten, and verify a test asserts no tool exposes `confirmationRequired` or any backend-generated id
- [x] 12.2 Switch the runtime from `withStructuredOutput` to `bindTools`, keeping the `AiOrderingStructuredModel` seam so tests still stub a plain object, and verify the runtime test passes with a stub returning `tool_calls` instead of a parsed response
- [x] 12.3 Read the answer from the model's tool call in the planner, mapping tool name to response type, and verify a test covers one call of each tool plus a plain-text reply mapping to `message`
- [x] 12.4 Validate tool arguments through the existing gate and the four data checks without restating any rule, and verify the existing output-gate and validation tests still cover the same rejections after the switch
- [x] 12.5 Treat "the model called no tool and returned no usable text" as an explicit gate rejection with its own reason, since a bound tool is not enforced the way a response schema was, and verify a test feeds back a reply with no tool call and asserts the rejection plus the repair attempt
- [x] 12.6 Update the affected tests (output gate, repair, runtime, service) to the tool-call shape, and verify the assertions that matter are preserved — at most two model calls, degradation to the model's own reply, backend-owned fields never taken from the model
- [x] 12.7 Run the transport verification: `pnpm --filter api run test`, `pnpm --filter api run lint`, `pnpm --filter api run build`
