## MODIFIED Requirements

### Requirement: Proposals are validated before the guest sees them

A `proposal` response SHALL contain only operations that are valid against
current menu and cart state at the time of the response, and that would change
that state. When no valid operation can be produced, the system SHALL return a
non-proposal response instead of an invalid proposal.

The assistant SHALL be given a bounded number of attempts to produce a usable
answer: at most three in one turn. After an attempt that cannot be used, the
assistant SHALL be told what was wrong with it. The final attempt SHALL NOT be
able to propose cart changes, and SHALL be used to tell the guest what could not
be done.

A reply the assistant wrote to accompany a proposal SHALL NOT be shown to the
guest when none of that proposal's operations survived validation.

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

#### Scenario: An operation that changes nothing never reaches the guest

- **WHEN** the assistant produces an update whose every supplied field already
  matches the item's current value
- **THEN** that operation is not shown to the guest, and the assistant is told
  what was wrong with it

#### Scenario: Clearing a note that does not exist changes nothing

- **WHEN** the assistant produces an update that clears a note on an item which
  has no note
- **THEN** that operation is not shown to the guest

#### Scenario: A proposal with some valid operations keeps those

- **WHEN** the assistant's corrected proposal still contains an invalid
  operation alongside valid ones
- **THEN** the guest receives a proposal containing only the valid operations

#### Scenario: No valid operation is explained by the assistant

- **WHEN** every operation the assistant produced fails validation on both
  attempts that may propose
- **THEN** the assistant is asked once more, without the ability to propose, and
  the guest receives its `message`, `choices` or `unanswered` response and no
  proposal

#### Scenario: The final attempt cannot propose

- **WHEN** the assistant answers its final attempt with cart changes
- **THEN** those changes are not shown to the guest and nothing is offered to
  apply

#### Scenario: A turn makes at most three attempts

- **WHEN** every attempt in a turn is unusable
- **THEN** the assistant has been called three times and is not called again

#### Scenario: A reply that promised changes is not shown without them

- **WHEN** every operation of a proposal fails validation
- **THEN** the reply written to accompany that proposal is not shown to the
  guest and does not appear in the conversation the assistant later reads back

#### Scenario: A failed final attempt yields a system notice

- **WHEN** the final attempt fails, runs out of the turn's time, or cannot be
  used
- **THEN** the guest receives a fixed notice that the request could not be
  processed, worded as a system message rather than in the assistant's voice

#### Scenario: The system notice follows the guest's language

- **WHEN** a guest who wrote in English receives the system notice in a store
  whose default language is Chinese
- **THEN** the notice is in English

#### Scenario: The system notice falls back to the store's language

- **WHEN** the guest's message contains no text in a language the notice is
  written in
- **THEN** the notice is in the store's default language

### Requirement: Proposal outcomes are reported back to the assistant

The outcome of a proposal SHALL be recorded against the turn that produced it, at
the moment the outcome is determined, with each operation carrying one of
`accepted`, `rejected`, `superseded`, `no_action`, or `failed`. A dismissal and a
failure SHALL remain distinguishable, as SHALL a refusal and an abandonment, and
as SHALL an operation the guest never answered and one an earlier failure
prevented from being attempted.

The assistant SHALL be given the outcome of an accepted proposal within the same
exchange that produced it, without waiting for the guest to send another message.

When the outcome of the most recent proposal is reported to the assistant, each
operation SHALL be described by what it proposed, not only by its identifier.

#### Scenario: Dismissal is reported as a rejection

- **WHEN** a guest dismisses an operation and accepts the rest
- **THEN** that operation is recorded as `rejected`

#### Scenario: An outcome is recorded without a further guest message

- **WHEN** a guest accepts a proposal and then sends no further message
- **THEN** the proposal's outcome is already recorded and the conversation does
  not present the proposal as still undecided

#### Scenario: Typing over a pending proposal ends it

- **WHEN** a guest types a new message while a proposal is still pending
- **THEN** the proposal's operations are recorded as `superseded`, and it can no
  longer be applied

#### Scenario: Never answering is distinct from never being reached

- **WHEN** one proposal lapses unanswered and another is accepted but stopped by
  an earlier failure
- **THEN** the first proposal's operations are recorded as `superseded` and the
  second's unattempted operations as `no_action`

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

#### Scenario: The assistant is told what a lapsed operation was

- **WHEN** a proposal to add a product lapses unanswered and the guest sends
  another message
- **THEN** the assistant is told which product, quantity and options that
  operation proposed, together with the fact that the cart did not change

#### Scenario: Only the most recent proposal is described

- **WHEN** a conversation contains several proposals
- **THEN** the assistant is given the operations of the most recent one only

### Requirement: Merchant review of conversations

The system SHALL let a merchant read conversations for stores they are
authorized for, and SHALL let them list the questions the assistant marked as
unanswerable. Access SHALL be scoped to the merchant's own store.

A conversation under review SHALL show, for each turn, what the model answered
as well as the response the guest saw. The model's answer SHALL NOT be exposed
through any guest-facing endpoint.

The conversation list SHALL be reachable from the merchant navigation.

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

#### Scenario: Merchant sees what the model answered

- **WHEN** an authorized merchant user opens a turn whose response was changed
  by validation
- **THEN** the turn shows the answer the model gave, including the answer type
  it chose and what it supplied, beside the response the guest saw

#### Scenario: An unrecognized stored answer is not shown

- **WHEN** a stored model answer does not have a shape the review surface
  recognizes
- **THEN** it is omitted from the review rather than shown as raw stored data

#### Scenario: Conversations are reachable from the merchant navigation

- **WHEN** an authorized merchant user opens the merchant navigation
- **THEN** it offers an entry leading to the conversation list

### Requirement: A proposal cannot be applied once its ordering session has ended

A pending proposal SHALL be applicable only while the guest's ordering session
and its cart remain open for changes. Accepting a proposal after the cart has
stopped accepting changes SHALL NOT change the cart, and every operation the
guest kept SHALL still carry a result that is not `rejected`.

A proposal the system can no longer resume SHALL execute nothing, and the guest
SHALL be told it is no longer available.

#### Scenario: Accepting after the cart has closed changes nothing

- **WHEN** a guest accepts a proposal whose cart is no longer open for ordering
- **THEN** nothing reaches the cart, and the guest is told the cart no longer
  accepts changes

#### Scenario: A closed cart is recorded as a failure, not a refusal

- **WHEN** a guest accepts a proposal whose cart is no longer open for ordering
- **THEN** the first operation attempted is recorded as `failed` with the reason,
  the operations after it as `no_action`, and none of them as `rejected`

#### Scenario: A decision after the session has expired is refused

- **WHEN** a decision arrives after the guest's session has expired
- **THEN** it is rejected as unauthenticated and the proposal's recorded state is
  unchanged

#### Scenario: A proposal that can no longer be resumed executes nothing

- **WHEN** a guest accepts a proposal the system no longer holds the means to
  resume
- **THEN** nothing is executed, the cart is unchanged, and the guest is told the
  proposal is no longer available

## RENAMED Requirements

- FROM: `### Requirement: An unanswered proposal expires on a bounded lifetime`
- TO: `### Requirement: A proposal cannot be applied once its ordering session has ended`

## ADDED Requirements

### Requirement: A proposal belongs to the turn that made it

A proposal SHALL be applicable only until the guest sends another message. That
message SHALL settle an unanswered proposal before the assistant is asked to
answer it, so the assistant is told the proposal lapsed in the same turn in
which the guest moved on.

The response to that message SHALL report the proposal it settled and the
outcome recorded for each of its operations.

Accepting a proposal and sending a message at the same moment SHALL result in
exactly one of the two taking effect on that proposal.

#### Scenario: A message settles the open proposal

- **WHEN** a guest sends a message while a proposal is unanswered
- **THEN** the proposal is settled, and a later attempt to accept it executes
  nothing and tells the guest it is no longer available

#### Scenario: The response reports what the message settled

- **WHEN** a guest's message settles an unanswered proposal
- **THEN** the response to that message identifies the proposal and carries the
  outcome recorded for each of its operations

#### Scenario: A lapsed proposal is not reported as already answered

- **WHEN** a guest accepts a proposal their own later message has settled
- **THEN** the guest is told the proposal is no longer available, not that they
  already answered it

#### Scenario: An acceptance that wins is not overwritten

- **WHEN** an acceptance and a new message for the same proposal arrive together
  and the acceptance is recorded first
- **THEN** the proposal keeps the acceptance's results, and the response to the
  message does not report it as settled

#### Scenario: An already decided proposal is left alone

- **WHEN** a guest sends a message after accepting a proposal
- **THEN** the proposal's recorded outcome is unchanged

### Requirement: A past proposal shows its recorded outcome

Every proposal in the guest's transcript SHALL show the outcome the system
recorded for it. A proposal that is no longer the current one SHALL NOT be
presented as awaiting a decision.

#### Scenario: A lapsed proposal reads as lapsed

- **WHEN** a guest's message settles an unanswered proposal and the guest reads
  back through the transcript
- **THEN** that proposal's operations are shown as not applied, and no action is
  offered for them

#### Scenario: An applied and an abandoned proposal read differently

- **WHEN** a transcript contains one proposal the guest accepted and one they
  never answered
- **THEN** each is shown with its own recorded outcome

#### Scenario: An outcome reaches a proposal several turns back

- **WHEN** an outcome is recorded for a proposal that is not the most recent
  entry in the transcript
- **THEN** it is shown on that proposal, not on a later one

### Requirement: A concurrent cart write does not fail an accepted operation

An accepted operation that cannot be written because another write reached the
cart at the same moment SHALL be tried again a bounded number of times before it
is recorded as failed. No other failure SHALL be retried.

#### Scenario: A write that collides is tried again

- **WHEN** an accepted operation is refused because the cart was modified
  concurrently, and the cart is writable a moment later
- **THEN** the operation is recorded as `accepted` and the operations after it
  are still attempted

#### Scenario: Retries are bounded

- **WHEN** an accepted operation keeps being refused for a concurrent write
- **THEN** it is recorded as `failed` after a fixed number of tries, and the
  remaining operations are recorded as `no_action`

#### Scenario: A refusal that would repeat is not retried

- **WHEN** an accepted operation is refused because the product is sold out
- **THEN** it is attempted once and recorded as `failed`

### Requirement: The assistant reads and writes short codes for identifiers

Where the assistant is shown a product, modifier, option or cart item
identifier, the system SHALL show a short code derived from that identifier, and
SHALL resolve the codes in the assistant's answer back to the identifiers before
anything else uses them. A code SHALL resolve to the same identifier whatever
else is on the menu or in the cart, or to no identifier at all.

Anything shown to the guest, executed against the cart, or stored as the
proposal SHALL carry the real identifier.

#### Scenario: A code in a proposal becomes the real identifier

- **WHEN** the assistant proposes adding a product by its short code
- **THEN** the proposal the guest receives names the product's real identifier

#### Scenario: A code does not move when the menu changes

- **WHEN** products are added to or removed from the menu between two turns
- **THEN** every product still on the menu is shown under the same code as
  before

#### Scenario: Two identifiers that would share a code keep their full form

- **WHEN** two identifiers shown in the same turn would produce the same short
  code
- **THEN** both are shown in full, and that code resolves to neither

#### Scenario: A code that matches nothing is rejected

- **WHEN** the assistant answers with a code that matches no identifier shown in
  that turn
- **THEN** the operation is treated as naming an unknown product or item and is
  not shown to the guest

#### Scenario: The assistant is corrected in the codes it was shown

- **WHEN** the assistant is told that an operation it proposed was invalid
- **THEN** the explanation names the product or item by its short code
