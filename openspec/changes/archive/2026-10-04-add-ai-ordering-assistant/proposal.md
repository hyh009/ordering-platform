## Why

Storefront guests can only order by browsing the menu UI. Requests that are
natural in words ("something not too spicy, and nothing with pork") take many
taps to express, and questions about a dish ("what is in the fried platter?")
have no answer path at all short of asking staff.

This change adds a text assistant that helps a guest order without replacing
manual ordering. It also establishes the version and conversation-capture
groundwork needed to answer a recurring question later: does a newer model, or
a simpler prompt, do this job as well or better?

## What Changes

- Add a guest-facing ordering assistant to the storefront. Manual ordering,
  cart editing, and order submission stay exactly as they are. The assistant
  never submits an order.
- Add one public guest endpoint that produces an assistant turn. The endpoint
  plans a reply only; it never mutates the cart.
- The assistant returns one of four response types: a plain reply, a choice
  question, a cart-operation proposal, or an explicit "cannot answer" marker.
- A proposal renders as a card the guest accepts or rejects. Accepting runs the
  EXISTING guest cart commands from the frontend, so current cart validation,
  ownership rules, concurrency handling, and SSE cart sync apply unchanged.
- Report the outcome of a proposal (accepted, rejected, no action, or failed)
  back to the assistant on the next turn, so conversation logic can react to a
  rejection instead of guessing from cart state.
- Add a store-level setting that skips the confirmation step. The response
  carries the resolved flag and the frontend decides whether to render the
  accept/reject buttons.
- In a shared cart, the assistant may read every participant's items but may
  only propose changes to the items added by the guest it is talking to.
- Persist one conversation per guest participant, including the raw model
  output and the version id of every turn.
- Add a merchant backstage surface to read a store's conversations and the
  questions the assistant marked unanswerable.
- Version assistant prompts and runtime settings in code, one file per released
  version, selected by environment configuration.
- Add provider configuration (API key, model, version id) to the API env.

No breaking changes. Nothing that exists today changes behavior while the
assistant is disabled.

## Capabilities

### New Capabilities

- `ai-ordering-assistant`: the guest ordering assistant. Covers the turn
  request/response contract, the four response types, proposal
  accept/reject/expiry semantics and outcome reporting, shared-cart
  modification limits, output validation and the single repair retry,
  conversation persistence and retention, version selection, and merchant read
  access to conversations and unanswered questions.

### Modified Capabilities

None. `openspec list --specs` reports no existing specs, so this change
introduces the project's first capability.

## Impact

- `packages/shared`: new AI ordering contract module (request/response schemas
  and the response-type union), plus one new store settings field on the
  existing store contract.
- `apps/api`: a new route under `routes/v1/public/guest/`, a new service, a new
  `modules/aiOrdering/` capability, a new conversation model and repository, a
  new merchant read route, new env vars, and a new model provider SDK
  dependency.
- `apps/web`: a new storefront assistant feature with its page wiring, and a
  merchant conversation review page.
- Guides this change follows: `docs/agent/backend/architecture.md`,
  `docs/agent/backend/route-development.md`,
  `docs/agent/backend/mongo-schema.md`, `docs/agent/backend/repository.md`,
  `docs/agent/workflows/shared-contracts.md`,
  `docs/agent/frontend/architecture.md`,
  `docs/agent/frontend/code-placement.md`,
  `docs/agent/frontend/state-ownership.md`.

### Out of Scope

Each of these was discussed and deliberately excluded so it can ship on its own
schedule. The assistant is designed to degrade gracefully while they are absent.

- An AI-only product description field on the product schema. The assistant
  reads the existing `description` until that field exists.
- A participant dietary-preference survey (vegetarian, religious) carried on the
  cart participant and forwarded to the order.
- Any allergen handling. Declaring an allergy creates an expectation of
  protection that menu data cannot currently guarantee, so it needs a data
  completeness policy and hard server-side blocking before it can be offered.
- Streaming assistant replies.
- Human review labelling of assistant answers that are wrong rather than
  missing.
