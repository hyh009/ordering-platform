## Purpose

Defines what a guest's cart submission verifies before it becomes an order or
an add-on round: that what is being bought is still available, that its price is
still the price the guest saw, and which names the order records.

## ADDED Requirements

### Requirement: A submission is refused when a line's price has changed

Submitting a cart SHALL compare, for every line being submitted, the unit price
stored on the line with the unit price the store's current menu gives the same
product and the same selected options.

If any submitted line differs, the system SHALL refuse the whole submission. It
SHALL NOT create an order, SHALL NOT add a round to an existing order, and SHALL
NOT remove any line from the cart because of this refusal.

The system SHALL NOT submit a line at a price the guest has not seen.

#### Scenario: A price rose after the item was carted

- **WHEN** a guest submits a cart containing a line whose product price was
  raised by the merchant after the line was added
- **THEN** the submission is refused with a price-changed failure and no order
  is created

#### Scenario: A price fell after the item was carted

- **WHEN** a guest submits a cart containing a line whose product price was
  lowered by the merchant after the line was added
- **THEN** the submission is refused with a price-changed failure, the same as
  for a rise

#### Scenario: An option's adjustment changed

- **WHEN** a selected option's price adjustment was changed after the line was
  added, and the line's product price is unchanged
- **THEN** the submission is refused with a price-changed failure

#### Scenario: Nothing changed

- **WHEN** every submitted line's stored price equals the current menu price
- **THEN** the submission proceeds as it does today

### Requirement: The refusal says which lines changed and by how much

A price-changed refusal SHALL identify each affected line and carry both its
previous unit price and its current unit price.

#### Scenario: Several lines changed

- **WHEN** two of the three submitted lines have changed price
- **THEN** the refusal lists those two lines, each with its previous and current
  unit price, and does not list the third

### Requirement: A refusal leaves the cart showing the current prices

After a price-changed refusal, each affected line in the cart SHALL carry its
current unit price, and the cart's subtotal, service fee and total SHALL be
recomputed from the lines.

The guest SHALL be able to submit again without editing any line, and that
submission SHALL succeed if nothing has changed since.

#### Scenario: The guest confirms by submitting again

- **WHEN** a submission was refused for a price change and the guest submits
  again with no menu change in between
- **THEN** the order is created at the current prices

#### Scenario: The cart no longer shows a price the order would not honour

- **WHEN** a submission was refused for a price change
- **THEN** the cart's line prices and totals match what an immediate second
  submission would charge

### Requirement: Availability is checked before price

A line that is unavailable or sold out SHALL be refused as it is today, whether
or not its price also changed. A price-changed refusal SHALL be reported only
when no submitted line is unavailable.

#### Scenario: One line sold out and another changed price

- **WHEN** a submission contains a sold-out line and a line whose price changed
- **THEN** the submission is refused as unavailable, and no cart line is
  repriced by that refusal

### Requirement: An add-on round never reprices earlier rounds

Price comparison and repricing SHALL apply only to lines being submitted in the
current round. Lines already on the order from an earlier round SHALL keep the
price they were submitted at.

#### Scenario: A price changed between two rounds

- **WHEN** a guest submits an add-on round after the merchant changed the price
  of an item the guest ordered in the first round
- **THEN** the first-round line keeps its original price, and only the new
  round's lines are compared

### Requirement: A submitted order records the names current at submission

When a submission succeeds, the localized names recorded on each submitted line
— product name and the name of each selected modifier and option — SHALL be the
names the store's menu has at the moment of submission.

This SHALL NOT make a submission fail and SHALL NOT change any price.

#### Scenario: A translation was added after the item was carted

- **WHEN** a merchant adds an English name to an option after a guest carted it
  with only a Chinese name, and the guest then submits
- **THEN** the order's line carries the option's English name

#### Scenario: A renamed product

- **WHEN** a merchant renames a product after it was carted, and the guest then
  submits with no price change
- **THEN** the submission succeeds and the order records the new name
