## MODIFIED Requirements

### Requirement: Proposals are validated before the guest sees them

A `proposal` response SHALL contain only operations that are valid against
current menu and cart state at the time of the response, and that would change
that state. When no valid operation can be produced, the system SHALL return a
non-proposal response instead of an invalid proposal.

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

#### Scenario: No valid operation degrades to a reply

- **WHEN** every operation the assistant produced fails validation
- **THEN** the guest receives a `message` or `choices` response and no proposal

## ADDED Requirements

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
