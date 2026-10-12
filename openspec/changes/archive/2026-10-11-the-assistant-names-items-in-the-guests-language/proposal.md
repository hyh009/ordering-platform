## Why

A guest on the English storefront asked for an egg crepe. The product cards the
assistant showed read "Original Egg Crepe", the name the store gave that product
in English. The assistant's own sentences named it from a menu it had only ever
been shown in Chinese, so whatever English name appeared in a reply was the
model's translation and not the store's.

The cause is one argument. The menu the assistant reads is rendered in the
store's default locale for every guest
(`apps/api/src/services/aiOrdering.service.ts`, the `buildAiOrderingContext`
call), whatever language the guest's interface is in. The store's name for a
product in the guest's language exists in the menu data and is never shown to
the model.

It is worth doing now because the pieces are in place. The fix on
`fix/assistant-proposal-locale` (`b1a3492`) made the web client send the
interface locale on every assistant request and made the proposal card's labels
follow it. The card and the product cards now use the store's own names in the
guest's language, which leaves the assistant's replies as the one place on the
panel that does not.

## What Changes

- Every name in the menu the assistant reads is written in the store's default
  locale, followed by the name in the guest's interface locale when the
  interface is in a different locale and the store has a name in it. This covers
  the store's own name and category, product, modifier and option names.
- The cart the assistant reads names its items and their choices the same way.
- A guest whose interface is in the store's default locale gets the menu exactly
  as it is rendered today, byte for byte. Nothing changes for them.
- A name the store never translated is written once, in the locale it exists in.
- The assistant is told, in one sentence, to use the name written in the language
  it is replying in.
- The regression suite gains cases with an English interface, so the behavior is
  measured and so is the cost to the existing Chinese cases.

Deliberately **not** in this change, listed so a reader knows it was weighed:

- Product descriptions stay in one locale. See design decision 4.
- A guest typing in a language the store has no names in still gets the model's
  own translation. There is no store name to offer it.
- Replies already stored in a conversation are not rewritten. A summary written
  while the guest used another language stays as it was written.
- No change to the proposal card's labels, which `b1a3492` already settled.
- No change to `packages/shared` and none to `apps/web`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ai-ordering-assistant`: adds a requirement that the menu and cart the
  assistant reads carry the store's names in both the store's default locale and
  the guest's interface locale, and that the assistant names items by the
  store's name in the language it replies in.

## Impact

- `apps/api` — `modules/aiOrdering/context.ts` (menu and cart rendering),
  `modules/aiOrdering/types.ts` (the context input), `services/aiOrdering.service.ts`
  (passing the request's locale to the context), `prompts/coreInstructions.ts`
  (one sentence), `evaluation/replay.ts` and `evaluation/regressionCases.ts`
  (a per-case interface locale and the new cases).
- The version fingerprint of `v1-2026-09-30` moves, because the core
  instructions change. The version is a draft, so this is allowed; the stored
  corpus splits at the new fingerprint and the regression baseline has to be
  recorded again.
- Prompt size grows for guests whose interface is not in the store's default
  locale, by one extra name per menu line. It is unchanged for everyone else.
- The provider's prefix cache for a store's menu, shared across all of that
  store's guests today, is shared per interface locale instead.
- Depends on `b1a3492` being merged: the request's `locale` field comes from it.
