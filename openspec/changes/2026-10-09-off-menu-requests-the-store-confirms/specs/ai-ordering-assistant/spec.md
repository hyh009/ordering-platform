## ADDED Requirements

### Requirement: The assistant routes an addition the menu does not offer

When the guest asks for an addition the store offers neither as a product nor as
a choice on a product, the assistant SHALL record it as the item's off-menu
request.

The assistant SHALL NOT write such an addition into an item's note. The note
field's model-facing description SHALL name the field the request belongs in,
rather than enumerate what a note may not contain.

The assistant's reply SHALL use the same wording the guest-facing surfaces use:
that the store has been told, and that it may not be available. It SHALL NOT
tell the guest the request is accepted or included.

#### Scenario: An addition the store does not sell

- **WHEN** the guest orders a dish and asks to add something the store offers
  neither as a product nor as a choice on that dish
- **THEN** the proposed operation carries the addition as the item's off-menu
  request, and the item's note is unset

#### Scenario: A subtraction is still a note

- **WHEN** the guest orders a dish and asks for an ingredient to be left out
- **THEN** the proposed operation carries it as the item's note, and no off-menu
  request is set

#### Scenario: An addition the store does sell

- **WHEN** the guest asks to add something the store offers as a choice on that
  product, or as a separate product
- **THEN** the assistant proposes it as that choice or that product, and sets
  neither a note nor an off-menu request for it

#### Scenario: The reply matches what the system promised

- **WHEN** a proposed operation carries an off-menu request
- **THEN** the reply says the store has been told and may not be able to provide
  it, and does not say it is accepted
