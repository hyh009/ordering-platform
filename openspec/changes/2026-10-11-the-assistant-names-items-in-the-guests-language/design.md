## Context

See `proposal.md` for the motivation. What shapes the approach:

- `buildAiOrderingContext` in `apps/api/src/modules/aiOrdering/context.ts`
  takes one `locale` and uses it for every name in the menu block
  (`renderMenu`) and the cart block (`buildAiOrderingCartContext`). The service
  passes `store.locale.defaultLocale`.
- Since `b1a3492` the message request carries an optional `locale`, the guest's
  interface locale. The service uses it for proposal labels only.
- The context is assembled most-static first so the provider's prefix cache is
  usable: core instructions, then store data, then history, then the current
  turn. The store data block is identical for every guest of a store today.
- `v1-2026-09-30` is a draft version. Its fingerprint covers the core
  instructions, the tool names and descriptions, the answer shape and the
  temperature. It does not cover how the menu is rendered.
- The regression suite has 23 cases, all written in Chinese, and runs one
  locale per run. Its fixture menu already has an English name for every entry.
- Past prompt work on this assistant found, more than once, that what is
  rendered beside the ids the model copies outweighs a rule stated in prose, and
  that adding length to the prompt can flip an unrelated case.

This design follows `docs/agent/backend/architecture.md` and
`docs/agent/backend/unit-testing.md`, and updates `docs/features/ai-ordering.md`
per `docs/agent/workflows/feature-docs.md`. No intentional deviation.

`packages/shared` contracts do not change. `apps/web` does not change.

## Goals / Non-Goals

**Goals:**

- The assistant can name a category, product, modifier or option by the store's
  own name in the guest's interface language.
- A guest whose interface is in the store's default locale gets a prompt whose
  store data and cart blocks are byte-identical to today's.
- The effect on the existing Chinese cases is measured before it is trusted.

**Non-Goals:**

- Making the assistant reply in the interface language. It replies in the
  language the guest writes in, and that rule stays.
- Translating anything the store did not translate.
- Rewriting stored replies, summaries or proposal labels.
- Menu pruning. The whole menu still goes in every turn.

## Decisions

### 1. Default locale first, interface locale second, joined by `/`

A name is rendered as `原味蛋餅 / Original Egg Crepe`: the store's default-locale
name, then the interface-locale name. The second name is added only when all
three hold: the request names an interface locale, it differs from the store's
default locale, and the store has a non-empty name in it that is not the same
string as the first.

The default-locale name leads because it is the one every existing case and
every stored conversation was written against, and because leading with it keeps
the first name on each line in the same place it is today.

This applies to the store's name, category headings, product lines, modifier names both on the
product line's `choices:` list and in `## Choices`, option lines, and the cart
block's product, modifier and option names.

Alternatives considered:

- **Interface locale only.** Smallest prompt. Rejected because a guest on an
  English interface who writes in Chinese would leave the model matching Chinese
  words against a menu with no Chinese in it.
- **Every locale the store has, for every guest.** Keeps one shared cache entry
  per store. Rejected because it lengthens the prompt for default-locale guests,
  who are most guests and gain nothing from it.
- **Parentheses for the second name.** Rejected because the prompt already uses
  `code (name)` to mean "an id and the name to read", and because store names
  contain parentheses themselves, such as `雞塊(4塊)`.
- **A separate `|` column.** Rejected because every line is read by column
  position, and an optional column would shift price and flags on some lines and
  not others.

### 2. The context takes the two locales as two inputs

`AiOrderingContextInput` keeps `locale` as the store's default locale and gains
an optional `guestLocale`. The service passes `request.locale` to it. Absent, or
equal to `locale`, means one name per line and the existing output.

The rule for when a second name appears lives in one helper in `context.ts`
used by every name in both blocks, so the menu and the cart cannot disagree
about how a product is written.

Whether the store lists the interface locale in its `supportedLocales` is not
checked. The second name is shown when the data has one. A store that has an
English name for a product has written that name, whatever its settings say.

### 3. Descriptions stay in one locale

A product description is written once: in the interface locale when the store
has one there, otherwise in the default locale. For a default-locale guest that
is today's output.

Descriptions are the longest text in the menu block and the model paraphrases
them, it does not quote them as a name. Doubling them would roughly double the
block for the least gain.

### 4. One sentence tells the model which name to use

The last line of the core instructions, "Reply in the language the guest is
using.", gains one sentence after it: where a name is written in two languages,
use the one in the language of the reply, and never write both.

It sits there because it is a consequence of that rule and reads as one. It is
kept to a sentence because length in this prompt has cost unrelated cases
before. The rendered names do most of the work; the sentence settles which of
the two to pick and closes the one new failure the rendering opens, a reply that
copies `原味蛋餅 / Original Egg Crepe` whole.

This moves the fingerprint of `v1-2026-09-30`. The version is a draft, so the
edit is allowed and the corpus splits at the new fingerprint, which is what the
fingerprint is for.

Alternative considered: no sentence, rendering only. Rejected as the starting
point because with two names and no instruction the model has no stated basis
for choosing, and the both-names failure has no guard.

### 5. The prefix cache splits by interface locale

The store data block now varies with the interface locale. Guests on the
store's default locale still share one cached prefix, as today. Guests on
another interface locale share a second one among themselves. With two supported
locales that is at most two entries per store, and no change in ordering of the
context blocks is needed.

### 6. The suite gains a per-case interface locale and is run before and after

`AiOrderingReplayCase` gains an optional interface locale. The replay passes it
to the context as `guestLocale` and uses it for the labels in
`operationSummaries`, the same way the service now does. A case without one
behaves as every case does today.

New cases, all on an English interface, using names from the existing fixture:

- An English message that orders a product: the proposal adds that product.
- An English message whose answer names a product in text: the reply contains
  the store's English name for it.
- A Chinese message on the English interface that orders a product: the proposal
  adds that product, and the reply does not switch to English.
- Any of the above: the reply never contains `/` between two names.

The order of runs matters, because the last change of this kind to this prompt
had no before-run:

1. Full suite on the current code, to re-record the Chinese baseline.
2. Add the per-case locale and the new cases, run them on the current code, and
   record how they fail. That is the evidence the defect exists.
3. Make the rendering change and the instruction change. Run the full suite.

A Chinese case that changes between 1 and 3 is rerun alone with `--match`
before it is believed, since the suite has run-to-run variance even at
temperature 0.

### 7. Stored conversation text is left alone

History turns, the rolling summary and the proposal log are passed to the model
as they were stored. A guest who switches interface language mid-conversation
gets a menu with the second name from that turn on, beside history written
before it. The model already handles a conversation that changes language, and
rewriting stored text would mean translating it.

The proposal log's summaries are labels, which follow the interface locale since
`b1a3492`. On an English interface they are in English and the menu beside them
carries the English names, so the two agree.

A paused run resumed by a proposal decision carries the context it was started
with and is not re-rendered.

## Risks / Trade-offs

- [The extra names flip an existing Chinese case] → Chinese cases run on the
  default locale and their store data and cart blocks do not change at all. Only
  the one added sentence reaches them. The before and after runs in decision 6
  measure it, and the sentence can be shortened or dropped if it costs a case.
- [The model writes both names in a reply] → The sentence in decision 4 forbids
  it and a regression check looks for it. If it persists, the fix is a check in
  the output gate, not more wording.
- [A store name contains ` / `] → The line is still readable, since the model
  reads names and does not parse them. Accepted.
- [The model picks the interface-locale name while replying in the default
  language, or the reverse] → Covered by the Chinese-message-on-English-interface
  case.
- [The English cases are noisy on the free tier's lite model] → Rerun a single
  failure with `--match` before acting on it. A full run is about 2.5 minutes
  and the lite quota allows roughly 20 a day, so iterate with `--match` and keep
  full runs for the three in decision 6.
- [A larger prompt for non-default-locale guests] → One extra name per line,
  with descriptions not doubled. Accepted, and bounded by decision 3.

## Migration Plan

Starts from `main` after `b1a3492` is merged, on its own branch. No data
migration and no contract change. An older web client that sends no `locale`
gets today's prompt.

Rollback is reverting the change. Turns recorded under the new fingerprint stay
distinguishable in the corpus.

## Open Questions

- Whether the both-names check should also become an output gate check. It is
  decided by what the after-run shows, and adding it later changes no spec.
