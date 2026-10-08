## ADDED Requirements

### Requirement: A cart item carries a request for something the menu does not offer

A cart item SHALL be able to carry one request for something the store's menu
does not offer, separate from the item's note.

The system SHALL treat the two as different kinds of thing. A note is a
subtraction from, or an adjustment to, what was ordered, and needs no answer. An
off-menu request is something only the store can answer. The distinction SHALL
be carried by the contract, and SHALL NOT depend on a reader interpreting the
text.

The request SHALL travel with the item from the cart to the submitted order.

#### Scenario: A guest asks for something the menu does not sell

- **WHEN** the guest asks for an addition the store offers neither as a product
  nor as a choice on the product
- **THEN** the request is recorded on the item as an off-menu request, and not
  as the item's note

#### Scenario: A note stays a note

- **WHEN** the guest asks for an ingredient to be left out, or for how the dish
  should be made
- **THEN** it is recorded as the item's note, and no off-menu request is created

#### Scenario: The request reaches the order

- **WHEN** a cart containing an item with an off-menu request is submitted
- **THEN** the submitted order's matching item carries that request

### Requirement: An off-menu request is never priced

An off-menu request SHALL NOT change the price of its item, the order subtotal,
the service fee, or the order total. The system SHALL NOT charge for an off-menu
request under any configuration.

An off-menu request SHALL NOT be presented as part of what was ordered. It SHALL
NOT appear in an item's selected-option line, in any total, or in the order
summary as an ordered thing.

#### Scenario: Adding a request leaves the total unchanged

- **WHEN** an off-menu request is added to or removed from an item
- **THEN** the item price, the subtotal, the service fee and the order total are
  all unchanged

#### Scenario: A request is not an ordered item

- **WHEN** an item carrying an off-menu request is displayed
- **THEN** the request is shown as a pending question, and not among the item's
  chosen options

### Requirement: An off-menu request promises nothing to the guest

Wording shown to the guest about an off-menu request SHALL state that it has
been passed to the store and may not be available. It SHALL NOT state or imply
that the request is confirmed, accepted, agreed or included.

#### Scenario: The guest is told what was and was not promised

- **WHEN** the guest is shown an item carrying an off-menu request
- **THEN** the wording says the store has been told and may not be able to
  provide it, and says nothing about it being accepted

### Requirement: An unanswered request does not block the order

An order whose items carry off-menu requests SHALL be submittable. The system
SHALL NOT require any request to be answered, accepted or declined before
submission, and SHALL NOT fail submission because of one.

#### Scenario: Submitting with an unanswered request

- **WHEN** the guest submits an order containing an item with an off-menu
  request
- **THEN** the order is submitted

### Requirement: The merchant sees what the guest wrote for them

The merchant's view of an order SHALL show every off-menu request on it, each
identified with the item it belongs to.

That view SHALL also show every note the guest wrote: each item's note, and the
order-level note written at submission.

An off-menu request SHALL be visually distinguishable from a note, so the
merchant can tell being asked from being informed without reading the text.

#### Scenario: A request is visible with its item

- **WHEN** the merchant opens an order containing an item with an off-menu
  request
- **THEN** the request is shown against that item

#### Scenario: Notes are visible too

- **WHEN** the merchant opens an order whose items carry notes, or which carries
  an order-level note
- **THEN** those notes are shown

#### Scenario: A question is not mistaken for an instruction

- **WHEN** an item carries both a note and an off-menu request
- **THEN** the two are shown distinguishably

### Requirement: The guest can write the request themselves

The guest SHALL be able to write, change and remove an off-menu request on an
item through the same surface on which they configure that item, without the
assistant.

#### Scenario: Writing a request while configuring an item

- **WHEN** the guest configures a product
- **THEN** they can write an off-menu request on it, and add the item with it

#### Scenario: Removing a request

- **WHEN** the guest edits an item carrying an off-menu request
- **THEN** they can clear it, and the item keeps its other values
