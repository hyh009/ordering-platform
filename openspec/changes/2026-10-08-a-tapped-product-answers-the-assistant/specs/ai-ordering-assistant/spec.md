## MODIFIED Requirements

### Requirement: The assistant can show products without changing the cart

The system SHALL provide a response type that presents a set of the store's
products to the guest. That response SHALL NOT change the cart and SHALL NOT
propose a cart change.

The model SHALL identify the products only by identifier: either one category
identifier, or an explicit list of product identifiers. The system SHALL supply
every other attribute of a product from the store's menu data.

Showing products SHALL leave the assistant's turn awaiting the guest, so that
the guest picking one of the shown products is an answer the assistant receives.
The guest SHALL NOT be required to pick: leaving the set alone SHALL change
nothing.

#### Scenario: A dish with more kinds than a question can offer

- **WHEN** the guest asks for a dish the store sells in more kinds than a
  choice question may offer
- **THEN** the assistant shows all of them as products, and proposes no cart
  change

#### Scenario: Showing does not change the cart

- **WHEN** the assistant shows products
- **THEN** the cart is unchanged, and the response carries no operation

#### Scenario: A guest adds from a shown product

- **WHEN** the guest picks a shown product in order to add it
- **THEN** the item reaches the cart through a proposal the guest confirms, and
  not through a path that bypasses the assistant

#### Scenario: A sold-out product is shown as sold out

- **WHEN** a product being shown is marked sold out
- **THEN** it appears in the set, marked sold out, and cannot be picked

#### Scenario: The guest leaves a shown set alone

- **WHEN** the assistant shows products and the guest neither picks one nor
  sends another message
- **THEN** the cart is unchanged and nothing is proposed

## ADDED Requirements

### Requirement: Picking a shown product answers the assistant

When the guest picks one of the products the assistant showed, the system SHALL
deliver that pick to the assistant as the answer to the set that was shown,
identifying the product by identifier.

The system SHALL resolve the pick against the set the assistant actually showed
this guest, SHALL reject a pick naming a product that set did not present, and
SHALL NOT resolve it against the live menu alone.

Picking SHALL NOT create a guest message in the conversation.

#### Scenario: The guest picks a product the assistant showed

- **WHEN** the guest picks one of the products in a shown set
- **THEN** the assistant receives the chosen product, and the conversation gains
  no guest message for the pick

#### Scenario: The assistant answers a pick with a proposal

- **WHEN** the assistant receives a picked product, and the guest's earlier
  message stated an option the store offers on that product
- **THEN** the assistant proposes the product with that option, without being
  told the option again

#### Scenario: The picked product does not offer the stated option

- **WHEN** the guest picks a product that does not offer an option their earlier
  message stated
- **THEN** the assistant says so in its reply, and proposes nothing the product
  cannot carry

#### Scenario: A pick naming a product that was never shown

- **WHEN** a pick names a product the shown set did not present
- **THEN** it is rejected, and nothing is proposed

### Requirement: A picked product reaches the cart only through the guest's confirmation

The system SHALL NOT add anything to the cart as a result of the guest picking a
shown product. What the assistant proposes in answer SHALL be validated and
SHALL require the guest's confirmation, as any other proposal does.

The guest SHALL be able to set the picked product's choices on that proposal
before confirming.

#### Scenario: Picking a product adds nothing

- **WHEN** the guest picks a product in a shown set
- **THEN** the cart is unchanged until the guest confirms the proposal that
  follows

#### Scenario: The guest adjusts the proposed item before confirming

- **WHEN** the proposal that answers a pick leaves one of the product's choices
  open, or answers one the guest wants changed
- **THEN** the guest can set that choice on the proposal and confirm it once

### Requirement: A shown set is stored with what it presented and what became of it

The system SHALL store, with the turn that showed products, the set's identifier
and the products it presented.

The system SHALL record what became of the set: that the guest picked from it,
that the guest answered in words instead, that a later message superseded it, or
that it lapsed with the ordering session. The system SHALL NOT require any of
these to be inferred from the absence of another.

#### Scenario: A reloaded conversation shows what became of a shown set

- **WHEN** the guest reloads a conversation in which products were shown
- **THEN** the set is shown with what became of it, and a set already picked
  from cannot be picked from again

#### Scenario: A set the guest answered in words

- **WHEN** the guest answers a shown set by typing instead of picking
- **THEN** the set is recorded as answered in words, distinctly from one that
  lapsed

### Requirement: A later message settles a standing shown set

When the guest sends a message while a shown set is awaiting them, the system
SHALL settle that set as superseded, SHALL stop it being pickable, and SHALL
release the assistant's awaiting turn.

#### Scenario: The guest changes the subject

- **WHEN** the guest sends an unrelated message while products are shown
- **THEN** the shown set is no longer pickable, and no proposal is produced from
  it

#### Scenario: The guest answers in words

- **WHEN** the guest answers a shown set by typing
- **THEN** the message is handled as the guest's turn, and the assistant answers
  it with the shown set in its context

### Requirement: A shown set that can no longer be answered says so

When a shown set can no longer be answered — the store has shut, a presented
product has sold out, the ordering session has ended, or a later message has
superseded it — the system SHALL show that it is no longer pickable rather than
accepting a pick it cannot honour.

#### Scenario: The ordering session ends

- **WHEN** the ordering session ends while products are shown
- **THEN** the set is no longer pickable, and the guest is told why

### Requirement: The assistant says what became of a proposal the guest confirmed

When the guest confirms a proposal, the system SHALL have the assistant say what
became of it, whether or not every operation succeeded. The system SHALL store
that sentence with the decision and SHALL present it on a restored conversation
as well as on the live one.

#### Scenario: Every operation succeeds

- **WHEN** the guest confirms a proposal and every operation is applied
- **THEN** the assistant says what it added, alongside the per-operation
  outcomes

#### Scenario: One operation fails

- **WHEN** the guest confirms a proposal and one of its operations fails
- **THEN** the assistant says which went through and which did not, beyond what
  the per-operation outcomes report

#### Scenario: A reloaded conversation keeps the sentence

- **WHEN** the guest reloads a conversation in which a proposal was confirmed
- **THEN** the assistant's sentence about it is shown, not only the
  per-operation outcomes
