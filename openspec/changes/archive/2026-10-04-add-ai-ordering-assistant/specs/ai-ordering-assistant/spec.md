## Purpose

Lets a storefront guest order and ask about dishes in plain text, with every
cart change proposed for review rather than applied silently, and keeps the
resulting conversations for the merchant to review and for prompt evaluation.

## ADDED Requirements

### Requirement: Guest assistant turn

The system SHALL expose one guest-authenticated endpoint that accepts a guest
message and returns exactly one assistant response. The endpoint SHALL NOT
modify the cart.

#### Scenario: Valid message returns one response

- **WHEN** an authenticated guest sends a non-empty message within the length
  limit
- **THEN** the system returns exactly one assistant response of type `message`,
  `choices`, `proposal`, or `unanswered`

#### Scenario: Request without a guest token is rejected

- **WHEN** a request arrives without a valid guest token
- **THEN** the system rejects it with 401 and no conversation turn is recorded

#### Scenario: Empty message is rejected

- **WHEN** a guest sends an empty or whitespace-only message
- **THEN** the system rejects it with 400 and does not call the model

#### Scenario: Over-long message is rejected

- **WHEN** a guest sends a message longer than the documented maximum length
- **THEN** the system rejects it with 400 and does not call the model

#### Scenario: Planning never changes the cart

- **WHEN** the assistant returns a `proposal` response
- **THEN** the cart contents are identical to what they were before the request

### Requirement: Assistant response types

Each response SHALL carry a machine-readable type so the client branches on a
stable value rather than on assistant prose. `choices` responses SHALL always
permit a free-text answer instead of a listed option.

#### Scenario: Dish question answered as a plain reply

- **WHEN** a guest asks about a dish that the menu data describes
- **THEN** the response type is `message` and it proposes no cart operations

#### Scenario: Missing required selection produces a choice question

- **WHEN** the guest's request cannot be turned into a valid cart operation
  because a required selection is missing
- **THEN** the response type is `choices`, listing selectable options, and free
  text remains permitted

#### Scenario: Guest answers a choice question with free text

- **WHEN** a guest replies to a `choices` response by typing instead of
  selecting a listed option
- **THEN** the system accepts the message and the assistant is told that no
  option was selected and what the guest typed instead

#### Scenario: Question the menu data cannot answer is marked

- **WHEN** a guest asks about a product whose stored data does not contain the
  answer
- **THEN** the response type is `unanswered` with a machine-readable reason
  identifying missing product information

### Requirement: Proposals are validated before the guest sees them

A `proposal` response SHALL contain only operations that are valid against
current menu and cart state at the time of the response. When no valid operation
can be produced, the system SHALL return a non-proposal response instead of an
invalid proposal.

#### Scenario: Unknown product never reaches the guest

- **WHEN** the assistant produces an operation naming a product that does not
  exist in the store's menu
- **THEN** that operation is not shown to the guest

#### Scenario: Sold-out product never reaches the guest

- **WHEN** the assistant produces an operation adding a product marked sold out
- **THEN** that operation is not shown to the guest

#### Scenario: Sold-out or invalid modifier selection never reaches the guest

- **WHEN** the assistant produces an operation whose modifier selections are
  incomplete, out of bounds, or reference a sold-out option
- **THEN** that operation is not shown to the guest

#### Scenario: No valid operation degrades to a reply

- **WHEN** every operation the assistant produced fails validation
- **THEN** the guest receives a `message` or `choices` response and no proposal

### Requirement: Shared cart visibility and modification limits

In a cart with several participants, the assistant SHALL be able to read every
participant's items, and SHALL only propose changes to items added by the guest
it is talking to. Adding an item SHALL always attribute it to that guest.

#### Scenario: Assistant can answer about the whole cart

- **WHEN** a guest asks what the group has ordered so far
- **THEN** the answer may reference items added by other participants

#### Scenario: Changing another participant's item is never proposed

- **WHEN** the assistant produces an operation updating or removing an item
  added by a different participant
- **THEN** that operation is not shown to the guest

#### Scenario: Cart rules remain authoritative

- **WHEN** a guest applies an accepted operation
- **THEN** it is subject to the same validation, ownership, and concurrency
  rules as the same change made manually through the cart

### Requirement: Per-operation proposal review

A proposal SHALL present each operation separately, each individually
dismissible, with a single apply action covering the operations that remain.
Results SHALL be reported per operation, not as one combined status.

#### Scenario: Guest dismisses one operation and applies the rest

- **WHEN** a proposal lists three operations, the guest dismisses one and
  applies
- **THEN** only the two remaining operations are executed

#### Scenario: Dismissing every operation resolves the proposal

- **WHEN** a guest dismisses every operation in a proposal
- **THEN** no apply action remains available and the proposal is resolved
  without changing the cart

#### Scenario: Partial failure is reported per operation

- **WHEN** a guest applies three operations and the second fails
- **THEN** the guest sees which operations reached the cart and which did not,
  rather than a single combined success or failure

### Requirement: Proposal outcomes are reported back to the assistant

The outcome of a proposal SHALL be reported on the guest's next turn, with each
operation carrying one of `accepted`, `rejected`, `no_action`, or `failed`. A
dismissal and a failure SHALL remain distinguishable, as SHALL a refusal and an
abandonment.

#### Scenario: Dismissal is reported as a rejection

- **WHEN** a guest dismisses an operation and then sends another message
- **THEN** that operation is reported as `rejected`

#### Scenario: Typing over a pending proposal expires it

- **WHEN** a guest types a new message while a proposal is still pending
- **THEN** the proposal is marked expired, its operations are reported as
  `no_action`, and it can no longer be applied

#### Scenario: A newer assistant response expires an earlier proposal

- **WHEN** a new assistant response arrives while an earlier proposal is still
  pending
- **THEN** the earlier proposal can no longer be applied

#### Scenario: Execution failure is distinct from refusal

- **WHEN** a guest applies an operation and it fails during execution
- **THEN** it is reported as `failed`, not as `rejected`

### Requirement: Confirmation may be skipped only when both the store and the assistant version allow it

The system SHALL resolve whether confirmation is required from both a
store-level setting and the assistant version's own permission, and SHALL
require confirmation unless both allow skipping it.

#### Scenario: Both allow skipping

- **WHEN** the store has enabled automatic application and the active assistant
  version permits it
- **THEN** validated operations are applied without presenting accept and
  dismiss controls

#### Scenario: Store allows but version does not

- **WHEN** the store has enabled automatic application and the active assistant
  version does not permit it
- **THEN** the proposal is presented for confirmation

#### Scenario: Default requires confirmation

- **WHEN** a store has not enabled automatic application
- **THEN** the proposal is presented for confirmation

### Requirement: Order submission stays human-only

The assistant SHALL NOT be able to submit an order. No assistant operation SHALL
exist that submits, pays for, or closes an order.

#### Scenario: Guest asks the assistant to submit the order

- **WHEN** a guest asks the assistant to place or submit the order
- **THEN** no submitting operation is produced and the guest is directed to the
  existing submit action

### Requirement: Conversation persistence and retention

The system SHALL record one conversation per guest participant in a cart, and
SHALL record every turn, including turns whose assistant output was rejected by
validation. Conversations SHALL outlive the cart and SHALL NOT be readable
through any guest-facing endpoint.

#### Scenario: Every turn is recorded

- **WHEN** a guest completes an assistant turn
- **THEN** the guest message, the response the guest saw, and the assistant
  version identifier are recorded

#### Scenario: Rejected assistant output is still recorded

- **WHEN** the assistant's output fails validation and the guest receives a
  degraded response
- **THEN** the turn is still recorded, including the original assistant output

#### Scenario: Conversation survives cart expiry

- **WHEN** a cart is deleted after expiring
- **THEN** its conversations remain readable by the merchant

#### Scenario: Guests cannot read conversations back

- **WHEN** a guest attempts to read stored conversations through the guest API
- **THEN** no endpoint exposes them

### Requirement: Conversation continuity follows the cart

A conversation SHALL continue for as long as its cart does, including across
add-on rounds submitted from the same cart. A new cart SHALL begin a new
conversation.

#### Scenario: Add-on round continues the conversation

- **WHEN** a guest submits a round from a cart that stays active and then sends
  another assistant message
- **THEN** the assistant retains the earlier conversation context, and can
  resolve references to items already submitted

#### Scenario: A new cart begins a new conversation

- **WHEN** ordering continues in a new cart after the previous one was closed
- **THEN** a new conversation begins with no earlier history

### Requirement: Merchant review of conversations

The system SHALL let a merchant read conversations for stores they are
authorized for, and SHALL let them list the questions the assistant marked as
unanswerable. Access SHALL be scoped to the merchant's own store.

#### Scenario: Merchant reads their own store's conversations

- **WHEN** an authorized merchant user lists conversations for their store
- **THEN** the conversations for that store are returned

#### Scenario: Another store's conversations are not reachable

- **WHEN** a merchant user requests conversations for a store they are not
  authorized for
- **THEN** the request is refused

#### Scenario: Unanswerable questions are listed for follow-up

- **WHEN** an authorized merchant user lists unanswered questions for their
  store
- **THEN** each entry identifies the guest question and, when the reason is
  missing product information, the product it concerned

### Requirement: Request limits

The system SHALL limit assistant requests per guest token by rate and
concurrency, and SHALL cap the number of turns a single conversation can hold.
Exceeding a limit SHALL be refused without calling the model.

#### Scenario: Rate limit is enforced

- **WHEN** a guest token exceeds the permitted number of requests within a
  minute
- **THEN** further requests are refused until the window passes

#### Scenario: Concurrent requests are refused

- **WHEN** a second assistant request arrives for a guest token while one is
  still in flight
- **THEN** the second request is refused rather than queued

#### Scenario: Conversation turn ceiling is enforced

- **WHEN** a conversation reaches its maximum number of turns
- **THEN** further assistant requests for that conversation are refused and no
  stored turn is discarded to make room

### Requirement: The assistant is optional

The storefront SHALL function unchanged when the assistant is not enabled, and
SHALL present no assistant entry point in that case.

#### Scenario: Disabled assistant leaves ordering unchanged

- **WHEN** the assistant is not enabled for the deployment
- **THEN** the storefront presents no assistant entry point and all existing
  menu, cart, and order flows behave exactly as before

#### Scenario: Manual ordering stays available while the assistant is active

- **WHEN** the assistant is enabled and a guest is mid-conversation
- **THEN** the guest can still browse the menu, edit the cart, and submit the
  order without using the assistant
