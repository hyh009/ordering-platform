## MODIFIED Requirements

### Requirement: The assistant can show products without changing the cart

The system SHALL provide a response type that presents a set of the store's
products to the guest. That response SHALL NOT change the cart, SHALL NOT
propose a cart change, and SHALL NOT ask a question.

The model SHALL identify the products only by identifier: either one category
identifier, or an explicit list of product identifiers. The system SHALL supply
every other attribute of a product from the store's menu data.

The model SHALL be able to name the options the guest has already stated, by
option identifier only. The system SHALL determine which of the shown products
offer each stated option, and SHALL report that determination in the response.
The model SHALL NOT be asked which products offer it.

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

#### Scenario: The guest states an option while asking to see a kind of dish

- **WHEN** the guest asks to see a kind of dish and names an option the store
  offers on it
- **THEN** the shown products that offer that option are reported as carrying
  it, and the guest is shown which ones those are before choosing between them

#### Scenario: A shown product does not offer the stated option

- **WHEN** a product in the shown set does not offer a stated option
- **THEN** that product is still shown, and it is not reported as carrying the
  option

#### Scenario: No shown product offers the stated option

- **WHEN** no product in the shown set offers a stated option
- **THEN** the response reports that option as carried by nothing, so the guest
  can be told rather than left to discover it

#### Scenario: An option the menu does not contain

- **WHEN** the model states an option identifier that the store's menu does not
  contain
- **THEN** the response is rejected and repaired, as for any identifier the menu
  does not contain

## ADDED Requirements

### Requirement: A carried option is selected, visible, and the guest's to undo

When the guest opens a shown product that carries a stated option, the system
SHALL open the product's configuration with that option already selected, SHALL
present it among the product's own choices so the guest can see it, and SHALL
allow the guest to deselect it before confirming.

The system SHALL NOT add anything to the cart until the guest confirms.

#### Scenario: Opening a product that carries an option

- **WHEN** the guest opens a shown product that carries a stated option
- **THEN** that option is already selected in the product's configuration, and
  the price shown accounts for it

#### Scenario: The guest removes a carried option

- **WHEN** the guest deselects a carried option before confirming
- **THEN** the item is added without it

### Requirement: A stated option applies only to the answer that carried it

The system SHALL apply a stated option only to the products shown in answer to
the message that stated it. A stated option SHALL NOT be applied to a product
the guest opens from any other surface, and SHALL NOT persist as a preference
across later turns.

#### Scenario: A product opened from the menu

- **WHEN** the guest opens a product from the menu grid after an earlier message
  stated an option
- **THEN** nothing is preselected from that earlier message
