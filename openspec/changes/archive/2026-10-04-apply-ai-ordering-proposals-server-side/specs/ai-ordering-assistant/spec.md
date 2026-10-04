## MODIFIED Requirements

### Requirement: Guest assistant turn

The system SHALL expose one guest-authenticated endpoint that accepts a guest
message and returns exactly one assistant response. The endpoint SHALL NOT
modify the cart.

The system SHALL expose a second guest-authenticated endpoint that accepts the
guest's decision on a pending proposal. That endpoint SHALL change the cart, and
only by executing operations the guest accepted from a proposal the system
itself produced.

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

#### Scenario: Only accepted operations are executed

- **WHEN** a guest accepts a proposal and names the operations they kept
- **THEN** the system executes only operations belonging to that proposal as the
  system recorded it, and ignores any operation content supplied by the caller

#### Scenario: Accepting an unknown proposal changes nothing

- **WHEN** a decision arrives naming a proposal that does not exist in this
  guest's conversation
- **THEN** the system rejects it and the cart is unchanged

### Requirement: Per-operation proposal review

A proposal SHALL present each operation separately, each individually
dismissible, with a single apply action covering the operations that remain.
Results SHALL be reported per operation, not as one combined status.

Executing an accepted proposal SHALL attempt every kept operation in the order
proposed, and SHALL NOT undo operations that already succeeded when a later one
fails. Every operation in the proposal SHALL carry a result, including
operations the guest dismissed and operations that were not attempted.

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

#### Scenario: A failure leaves earlier successes in the cart

- **WHEN** a guest applies three operations and the second fails
- **THEN** the first operation's effect remains in the cart and the response
  reports success, failure, and any unattempted operation distinctly

#### Scenario: Every operation carries a reason when it did not succeed

- **WHEN** an operation fails
- **THEN** its result carries a stable reason code identifying why, and that
  reason is available both to the guest and to the assistant

### Requirement: Proposal outcomes are reported back to the assistant

The outcome of a proposal SHALL be recorded against the turn that produced it, at
the moment the outcome is determined, with each operation carrying one of
`accepted`, `rejected`, `no_action`, or `failed`. A dismissal and a failure SHALL
remain distinguishable, as SHALL a refusal and an abandonment.

The assistant SHALL be given the outcome of an accepted proposal within the same
exchange that produced it, without waiting for the guest to send another message.

#### Scenario: Dismissal is reported as a rejection

- **WHEN** a guest dismisses an operation and accepts the rest
- **THEN** that operation is recorded as `rejected`

#### Scenario: An outcome is recorded without a further guest message

- **WHEN** a guest accepts a proposal and then sends no further message
- **THEN** the proposal's outcome is already recorded and the conversation does
  not present the proposal as still undecided

#### Scenario: Typing over a pending proposal expires it

- **WHEN** a guest types a new message while a proposal is still pending
- **THEN** the proposal is marked expired, its operations are recorded as
  `no_action`, and it can no longer be applied

#### Scenario: A newer assistant response expires an earlier proposal

- **WHEN** a new assistant response arrives while an earlier proposal is still
  pending
- **THEN** the earlier proposal can no longer be applied

#### Scenario: Execution failure is distinct from refusal

- **WHEN** a guest applies an operation and it fails during execution
- **THEN** it is recorded as `failed`, not as `rejected`

#### Scenario: The assistant answers a failure in the same exchange

- **WHEN** a guest accepts a proposal and one operation fails because the
  product is unavailable
- **THEN** the response to that acceptance carries an assistant reply that
  accounts for the failure, rather than deferring it to the guest's next message

## ADDED Requirements

### Requirement: A proposal may be applied once

A proposal SHALL be applicable at most once. A second decision on the same
proposal SHALL execute nothing and SHALL NOT alter the recorded outcome.
Obtaining the same operations again SHALL require a new proposal from the
assistant.

#### Scenario: A repeated acceptance does not change the cart again

- **WHEN** a decision is sent twice for the same proposal, with the same
  operations
- **THEN** the cart reflects one execution, and the second request reports that
  the proposal was already decided

#### Scenario: Two simultaneous acceptances execute once

- **WHEN** two decisions for the same proposal arrive concurrently
- **THEN** exactly one executes and the other is refused as already decided

#### Scenario: A decided proposal offers no further action

- **WHEN** a guest views a proposal that has already been decided
- **THEN** no apply action is offered for it, and no action is offered for an
  individual operation within it

### Requirement: An unanswered proposal expires on a bounded lifetime

A pending proposal SHALL remain applicable for a bounded period. Once that
period passes, the proposal SHALL no longer be applicable and its operations
SHALL be recorded as `no_action`. Expiry SHALL be distinguishable from a refusal.

#### Scenario: A proposal left unanswered expires

- **WHEN** a guest leaves a proposal undecided for longer than its lifetime and
  then accepts it
- **THEN** nothing is executed, the cart is unchanged, and the guest is told the
  proposal is no longer available

#### Scenario: Expiry is not a refusal

- **WHEN** a proposal expires unanswered
- **THEN** its operations are recorded as `no_action` rather than `rejected`

### Requirement: A reloaded conversation restores a proposal's real state

A conversation read back after a reload SHALL present each proposal in the state
the system recorded for it. A proposal that was applied SHALL be shown with its
per-operation results, a proposal that was partially applied SHALL show which
operations succeeded and which did not, and a proposal that is still pending and
unexpired SHALL remain applicable.

#### Scenario: An applied proposal reads as applied

- **WHEN** a guest accepts a proposal and then reloads
- **THEN** the proposal is shown as applied with its per-operation results, and
  no text suggests the guest still needs to ask for it

#### Scenario: A pending proposal survives a reload

- **WHEN** a guest reloads while a proposal is still pending and unexpired
- **THEN** the proposal is still applicable, and accepting it executes its
  operations exactly once

#### Scenario: A partially applied proposal shows both outcomes

- **WHEN** a guest accepts a proposal in which one operation failed, then
  reloads
- **THEN** the succeeded and failed operations are each shown with their
  recorded result
