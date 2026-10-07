## ADDED Requirements

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

## MODIFIED Requirements

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
