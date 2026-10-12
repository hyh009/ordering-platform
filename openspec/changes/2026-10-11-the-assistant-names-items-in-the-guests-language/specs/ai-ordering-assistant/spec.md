## ADDED Requirements

### Requirement: The assistant reads the store's names in the guest's interface language

Where the assistant is shown the name of the store, of a category, product,
modifier or option, or of an item or choice in the cart, the system SHALL show
the store's name for it in the store's default language. When the guest's interface is in a
different language and the store has a name in that language, the system SHALL
show that name as well, beside the first.

The system SHALL NOT show a translation the store did not write. A name the
store has in only one language SHALL be shown once.

When the assistant names a category, product, modifier or option in text the
guest reads, and the store has a name for it in the language of that text, the
assistant SHALL use the store's name.

#### Scenario: An interface in another language adds the store's name in it

- **WHEN** a guest whose interface is in English sends a message to a store
  whose default language is Chinese, and a product has both a Chinese and an
  English name
- **THEN** the assistant is shown both names for that product

#### Scenario: An interface in the store's default language changes nothing

- **WHEN** a guest whose interface is in the store's default language sends a
  message
- **THEN** the assistant is shown each name once, in that language, exactly as
  it was before this requirement

#### Scenario: A request that names no interface language

- **WHEN** a message arrives without the guest's interface language
- **THEN** the assistant is shown each name once, in the store's default
  language

#### Scenario: A name the store did not translate

- **WHEN** a guest whose interface is in English sends a message, and a product
  has a name only in Chinese
- **THEN** the assistant is shown that product's Chinese name alone, and no
  English name is supplied for it

#### Scenario: The store itself is named the same way

- **WHEN** a guest whose interface is in English sends a message to a store
  whose display name exists in both Chinese and English
- **THEN** the assistant is shown both names for the store

#### Scenario: The cart is named the same way as the menu

- **WHEN** a guest whose interface is in English has an item in the cart whose
  product has both a Chinese and an English name
- **THEN** the assistant is shown both names for that cart item and for each of
  its choices that has both

#### Scenario: A reply uses the store's name

- **WHEN** a guest whose interface is in English writes in English and the
  assistant names a product in its reply
- **THEN** the reply uses the English name the store gave that product

#### Scenario: A guest writing in the store's language on another interface

- **WHEN** a guest whose interface is in English writes in Chinese and the
  assistant names a product in its reply
- **THEN** the reply uses the Chinese name the store gave that product

#### Scenario: A proposal is unaffected by how names are shown

- **WHEN** the assistant proposes a product it was shown under two names
- **THEN** the proposal names the product's identifier, and the label the guest
  reads is the one the system derives
