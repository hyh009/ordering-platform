## ADDED Requirements

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
