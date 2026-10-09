## ADDED Requirements

### Requirement: The assistant can ask the guest to pick one of the store's products

The system SHALL provide a response type by which the assistant asks the guest
to pick one of the store's products. That response SHALL NOT change the cart,
SHALL NOT propose a cart change, and SHALL carry a question for the guest to
read alongside the products.

The model SHALL identify the products only by identifier. The system SHALL
supply every other attribute of a product from the store's menu data.

This response SHALL NOT be subject to the option limit that applies to a choice
question, because the products are presented as cards the guest scrolls rather
than as labels the guest reads at once.

#### Scenario: A dish with more kinds than a choice question can offer

- **WHEN** the guest asks for a dish the store sells in more kinds than a choice
  question may offer, and which kind they want has to be settled first
- **THEN** the assistant asks which one they want, presenting all of them, and
  proposes no cart change

#### Scenario: Asking does not change the cart

- **WHEN** the assistant asks the guest to pick a product
- **THEN** the cart is unchanged, and the response carries no operation

#### Scenario: A product identifier the menu does not contain

- **WHEN** the model names a product identifier the store's menu does not
  contain
- **THEN** the response is rejected and repaired, as for any identifier the menu
  does not contain

### Requirement: Tapping a product in a product question answers the assistant

When the guest picks one of the products the assistant asked about, the system
SHALL send that pick to the assistant as the guest's turn, identifying the
chosen product by identifier and recording which question it answers.

The pick SHALL appear in the conversation as the guest's own turn.

The system SHALL also accept a typed answer to a product question, and SHALL
tell the assistant that no product was picked and what the guest typed instead.

#### Scenario: The guest picks a product the assistant asked about

- **WHEN** the guest picks one of the products in a product question
- **THEN** a turn is sent carrying the chosen product's identifier and the
  question it answers, and the pick is shown in the conversation as the guest's
  turn

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

#### Scenario: The guest types instead of picking

- **WHEN** the guest answers a product question by typing instead of picking a
  presented product
- **THEN** the message is accepted, and the assistant is told that no product
  was picked and what the guest typed instead

### Requirement: A picked product reaches the cart only through the guest's confirmation

The system SHALL NOT add anything to the cart as a result of the guest picking a
product in a product question. What the assistant proposes in answer SHALL be
validated and SHALL require the guest's confirmation, as any other proposal
does.

#### Scenario: Picking a product adds nothing

- **WHEN** the guest picks a product in a product question
- **THEN** the cart is unchanged until the guest confirms the proposal that
  follows

### Requirement: Showing products and asking about products are separate paths

The system SHALL keep the response that shows products without asking, and the
guest opening one of those products SHALL continue to reach the product's
configuration without a turn being sent to the assistant.

#### Scenario: A guest browsing opens a shown product

- **WHEN** the assistant shows products without asking, and the guest opens one
- **THEN** the product's configuration opens, no turn is sent to the assistant,
  and the assistant proposes nothing

### Requirement: A product question that can no longer be answered says so

When a product question can no longer be answered — the store has shut, a
presented product has sold out, the ordering session has ended, or a later turn
has superseded the question — the system SHALL show that it is no longer
answerable rather than accepting a pick that cannot be honoured.

#### Scenario: A later turn supersedes the question

- **WHEN** the guest sends another message instead of answering a product
  question
- **THEN** the earlier question's products are no longer pickable

#### Scenario: A presented product sells out

- **WHEN** a product presented in a product question is sold out
- **THEN** it is shown as unavailable and cannot be picked
