# ai-ordering-assistant Specification

## Purpose
Lets a storefront guest order and ask about dishes in plain text, with every
cart change proposed for review rather than applied silently, and keeps the
resulting conversations for the merchant to review and for prompt evaluation.

## Requirements

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

#### Scenario: No valid operation degrades to a reply

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

#### Scenario: Typing over a pending proposal expires it

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

### Requirement: The cart is visible from inside the assistant conversation

A guest using the assistant SHALL be able to see their current cart without
leaving the conversation, and SHALL be able to change item quantities and remove
their own items from there. Viewing or editing the cart SHALL NOT dismiss the
conversation or lose the transcript.

The cart shown SHALL be the guest's real cart rather than a restatement of it, so
prices, quantities, selected options and totals are the same values the cart
itself reports.

On a wide viewport the cart SHALL be visible at the same time as the
conversation. On a narrow viewport, where both do not fit, the cart SHALL be
reachable and dismissible within the assistant.

#### Scenario: Applied changes appear in the cart without navigating

- **WHEN** a guest accepts a proposal while the assistant is open
- **THEN** the resulting cart items, quantities and totals are visible to the
  guest without closing the assistant or navigating to the cart

#### Scenario: Wide viewport shows the conversation and the cart together

- **WHEN** a guest opens the assistant on a wide viewport
- **THEN** the conversation and the cart are both on screen at once

#### Scenario: Narrow viewport reaches the cart and returns

- **WHEN** a guest opens the assistant on a narrow viewport and asks to see the
  cart
- **THEN** the cart is shown, and dismissing it returns to the same conversation
  with its transcript and any open proposal intact

#### Scenario: Guest adjusts an assistant-added item without leaving

- **WHEN** the assistant has added an item and the guest wants two of it instead
  of one
- **THEN** the guest can change the quantity from inside the assistant, and the
  change is applied to the cart

#### Scenario: Shared cart stays read-only for other participants

- **WHEN** a guest views the cart from inside the assistant in a shared cart that
  contains another participant's items
- **THEN** those items are visible but cannot be changed or removed by this
  guest, matching the limits that apply everywhere else in the storefront

#### Scenario: Another participant's change appears while the assistant is open

- **WHEN** another participant adds an item to the shared cart while this guest
  has the assistant open
- **THEN** the cart the guest sees inside the assistant reflects that change

#### Scenario: The guest is not told to go and look at the cart

- **WHEN** a proposal has been applied
- **THEN** the assistant does not instruct the guest to navigate to the cart to
  check the result, because the result is already visible

### Requirement: Applying a proposal is blocked until the cart has settled

While a proposal is being applied, the assistant SHALL show that work is in
progress and SHALL NOT accept a second apply of the same proposal. The indication
SHALL persist until every cart operation in that apply has returned a result, and
SHALL be cleared whether the apply succeeded, partly failed, or was abandoned.

An apply SHALL NOT be repeatable by a second activation of the apply action, and
this SHALL hold independently of whether the control is visually disabled.

#### Scenario: Guest sees the apply in progress

- **WHEN** a guest applies a proposal
- **THEN** the assistant indicates that the change is in progress, and stops
  indicating it once every operation in that proposal has a result

#### Scenario: A second apply cannot duplicate the cart

- **WHEN** a guest activates the apply action twice before the first apply has
  finished
- **THEN** the operations are sent to the cart once, not twice

#### Scenario: The indication clears after a failure

- **WHEN** an apply ends with a failure, whether on one row or on the session
- **THEN** the in-progress indication is cleared and the guest can read the result

#### Scenario: The cart shown after an apply is the confirmed one

- **WHEN** the in-progress indication clears
- **THEN** the cart the guest sees reflects what the server stored, not a
  predicted result

### Requirement: The guest can submit the order from the assistant

A guest SHALL be able to submit their order from inside the assistant, with the
same confirmation step that submitting from the cart requires. This does not
widen what the assistant itself can do: no assistant operation submits, pays for,
or closes an order, per "Order submission stays human-only".

#### Scenario: Guest submits from the assistant

- **WHEN** a guest has finished ordering through the conversation and chooses to
  submit from inside the assistant
- **THEN** they are asked to confirm, and on confirming the order is submitted and
  they are taken to the order

#### Scenario: Declining the confirmation changes nothing

- **WHEN** a guest chooses to submit from inside the assistant and then declines
  the confirmation
- **THEN** no order is submitted and the conversation is unchanged

#### Scenario: The assistant still cannot submit on its own

- **WHEN** a guest asks the assistant to submit the order
- **THEN** no submitting operation is produced, and the guest is pointed at the
  submit action they can now reach without leaving the conversation

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

### Requirement: A proposal cannot be applied once its ordering session has ended

A pending proposal SHALL be applicable only while the guest's ordering session
and its cart remain open for changes. Accepting a proposal after the cart has
stopped accepting changes SHALL NOT change the cart, and every operation the
guest kept SHALL still carry a result that is not `rejected`.

A proposal the system can no longer resume SHALL execute nothing, and the guest
SHALL be told it is no longer available.

#### Scenario: A proposal left unanswered expires

- **WHEN** a guest leaves a proposal undecided until its cart is no longer open
  for ordering and then accepts it
- **THEN** nothing reaches the cart, and the guest is told the cart no longer
  accepts changes

#### Scenario: Expiry is not a refusal

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

### Requirement: The model-facing contract documents every field it offers

Each field the assistant is asked to supply SHALL carry a description of what it
is for and what belongs in it. Where omitting a field and supplying an empty
value mean different things, the contract SHALL state both meanings.

Those descriptions SHALL reach the model, and SHALL NOT be added to the contracts
shared with the guest cart API.

#### Scenario: Every model-facing field is described

- **WHEN** the model-facing schema is prepared for the provider
- **THEN** every field it offers carries a description

#### Scenario: Omission and emptiness are distinguished

- **WHEN** a field can be omitted to leave a value unchanged and also set to an
  empty value to clear it
- **THEN** the description states both meanings

#### Scenario: Model-facing wording stays out of the shared cart contract

- **WHEN** the cart request contracts are read by the guest cart API
- **THEN** they carry no description written for the assistant

### Requirement: A proposal's per-operation label is produced by the system

The one-line label shown beside each proposed operation SHALL be derived by the
system from the operation and current menu and cart state. The assistant SHALL
NOT supply it.

#### Scenario: The assistant cannot author the label

- **WHEN** the assistant produces a proposal
- **THEN** it supplies no label, and the label the guest reads is derived from
  the operation itself

#### Scenario: The label describes what will actually happen

- **WHEN** an operation is shown to the guest
- **THEN** its label reflects the operation's own fields, so it cannot describe
  a change the operation does not make

#### Scenario: A label is still delivered to every reader

- **WHEN** a proposal is returned, restored from a transcript, or read in the
  merchant review surface
- **THEN** each operation carries a label

### Requirement: A version identifies the answer shape as well as the prompt

A version's recorded identity SHALL cover the shape the assistant is required to
answer in, as well as its instructions and limits. Two turns produced under
different answer shapes SHALL be distinguishable in the stored corpus.

#### Scenario: Changing the answer shape separates the corpus

- **WHEN** the shape the assistant must answer in changes
- **THEN** turns recorded before and after carry different version identities

#### Scenario: A frozen version's answer shape cannot drift unnoticed

- **WHEN** the answer shape of a released, frozen version is changed
- **THEN** the change is refused rather than silently redefining what that
  version's stored turns refer to

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

### Requirement: The assistant can show products without changing the cart

The system SHALL provide a response type that presents a set of the store's
products to the guest. That response SHALL NOT change the cart, SHALL NOT
propose a cart change, and SHALL NOT ask a question.

The model SHALL identify the products only by identifier: either one category
identifier, or an explicit list of product identifiers. The system SHALL supply
every other attribute of a product from the store's menu data.

#### Scenario: A dish with more kinds than a question can offer

- **WHEN** the guest asks for a dish the store sells in more kinds than a
  choice question may offer
- **THEN** the assistant shows all of them as products, and proposes no cart
  change

#### Scenario: Showing does not change the cart

- **WHEN** the assistant shows products
- **THEN** the cart is unchanged, and the response carries no operation

#### Scenario: A guest adds from a shown product

- **WHEN** the guest opens a shown product and confirms it
- **THEN** the item is added through the same path the menu page uses, and the
  assistant proposed nothing

#### Scenario: A sold-out product is shown as sold out

- **WHEN** a product being shown is marked sold out
- **THEN** it appears in the set, marked sold out, and cannot be added

### Requirement: A shown set is named by identifiers that exist

The system SHALL verify a shown set against the menu that produced the turn's
context. Every product identifier SHALL exist in that menu. A category
identifier SHALL exist in that menu and contain at least one product.

The system SHALL reject a response naming anything else and SHALL tell the model
what was wrong, rather than showing the guest a partial or empty set.

The system SHALL require exactly one of the two: a category, or an explicit list
of products.

#### Scenario: Unknown product never reaches the guest

- **WHEN** the assistant names a product that is not in the store's menu
- **THEN** no set is shown, and the assistant is told what was wrong

#### Scenario: Empty or unknown category never reaches the guest

- **WHEN** the assistant names a category that does not exist, or that has no
  products
- **THEN** no set is shown, and the assistant is told what was wrong

#### Scenario: Naming both a category and a list is rejected

- **WHEN** the assistant names both a category and an explicit product list, or
  neither
- **THEN** no set is shown, and the assistant is told what was wrong

### Requirement: A hand-picked set is bounded; a category is not

When the assistant names products explicitly, the system SHALL accept at most
eight. When the assistant names a category, the system SHALL show every product
in it, with no upper bound.

#### Scenario: A hand-picked set over the bound is rejected

- **WHEN** the assistant names more than eight products explicitly
- **THEN** no set is shown, and the assistant is told what was wrong

#### Scenario: A category larger than the bound is shown whole

- **WHEN** the assistant names a category holding more than eight products
- **THEN** every product in it is shown

### Requirement: Asking the guest which thing they meant

The assistant SHALL ask the guest to choose only when what they said matches
more than one thing in the store data and the assistant cannot tell which one
they mean. One turn SHALL ask exactly one question.

A question SHALL offer at most five options, and SHALL NOT offer a list cut
short to fit that bound. When more things could be meant than a question may
offer, the assistant SHALL show them as products instead.

The guest SHALL always be able to answer by typing instead of picking.

#### Scenario: A question offers no more than five options

- **WHEN** the assistant asks the guest to choose
- **THEN** the question carries at most five options

#### Scenario: Too many candidates to offer becomes a shown set

- **WHEN** more products match the guest's words than a question may offer
- **THEN** the assistant shows them as products rather than offering some of
  them as options

#### Scenario: An unstated choice is still not a question

- **WHEN** the guest has simply not stated a sugar level, ice level, size or
  topping
- **THEN** the assistant does not ask, and proposes with that choice left open
