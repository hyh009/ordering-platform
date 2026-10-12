One slice: `apps/api`. `packages/shared` and `apps/web` do not change. Starts
from `main` after `b1a3492` is merged. Verification follows
`docs/agent/workflows/verification.md`.

The order is deliberate. The baseline and the failing cases are recorded before
the behavior changes, see design decision 6.

## 1. Baseline

- [x] 1.1 Run the full regression suite on the unchanged code with
  `pnpm --filter api run replay -- --versions v1-2026-09-30 --suite regression`
  and record the fingerprint, the score and each failing case in the pull
  request description. Rerun any failure alone with `--match` and record whether
  it holds. Verified by the recorded numbers being present

## 2. Suite — an interface locale per case

- [x] 2.1 Add an optional interface locale to `AiOrderingReplayCase` in
  `evaluation/replay.ts`. Use it for the labels in `operationSummaries`, falling
  back to the run's locale. Verified by `aiOrdering.replay.test.ts` passing with
  a case that sets it and one that does not
- [x] 2.2 Add the English-interface cases from design decision 6 to
  `evaluation/regressionCases.ts`, using product names from
  `evaluation/fixture.ts`: an English order, an English question answered in
  text, and a Chinese order on the English interface. Give each a check on the
  store's name and a check that the reply holds no ` / ` between two names.
  Verified by the suite listing the new cases
- [x] 2.3 Run only the new cases with `--match` on the unchanged rendering and
  record how each fails in the pull request description. Verified by the
  recorded outcomes being present

## 3. Rendering — two names

- [x] 3.1 Add an optional `guestLocale` to `AiOrderingContextInput` in
  `modules/aiOrdering/types.ts`. Verified by `pnpm --filter api run build`
- [x] 3.2 Add one helper in `modules/aiOrdering/context.ts` that writes a name
  per design decision 1, and use it for category, product, modifier and option
  names in `renderMenu`. Verified by unit tests in the context test file for:
  both names present, interface locale equal to the default, no interface
  locale, a name missing in the interface locale, and two identical strings
- [x] 3.3 Use the same helper for the product, modifier and option names in
  `buildAiOrderingCartContext`. Verified by a unit test with a cart item whose
  product has both names
- [x] 3.4 Write the product description once per design decision 3. Verified by
  unit tests for a description present in the interface locale and one present
  only in the default locale
- [x] 3.5 Add a test asserting that with no `guestLocale` the store data and
  cart blocks equal the output captured before this change, for the regression
  fixture. Verified by that test passing
- [x] 3.6 Pass the replay case's interface locale to the context as
  `guestLocale` in `evaluation/replay.ts`. Verified by `aiOrdering.replay.test.ts`
- [x] 3.7 Pass `request.locale` as `guestLocale` in the `buildAiOrderingContext`
  call in `services/aiOrdering.service.ts`. Verified by a service test that a
  message with `locale: 'en'` to a Chinese-default store produces a context
  containing both names, and that one without `locale` does not

## 4. Instruction

- [x] 4.1 Add the sentence from design decision 4 after "Reply in the language
  the guest is using." in `prompts/coreInstructions.ts`. Verified by the
  fingerprint of `v1-2026-09-30` differing from the one recorded in 1.1, and by
  `aiOrdering.versions.test.ts` still passing since the version is a draft

## 5. Measurement

- [x] 5.1 Run the full suite and record the new fingerprint, the score and each
  failing case beside the numbers from 1.1 and 2.3. Verified by the comparison
  being in the pull request description
- [x] 5.2 Rerun with `--match` every Chinese case that differs from 1.1 and
  every English case that fails. If a Chinese case is lost and holds on rerun,
  shorten or remove the sentence from 4.1 and repeat 5.1 before going further.
  Verified by each difference having a recorded rerun result

## 6. Documentation and verification

- [x] 6.1 Update `docs/features/ai-ordering.md`: the paragraph added by
  `b1a3492` that says the menu the model reads is still in the store's default
  locale, and the cache note for the store data block. Follow
  `docs/agent/workflows/feature-docs.md`. Verified by the doc describing two
  names and the per-locale cache
- [x] 6.2 Run `pnpm --filter api run test`, `pnpm --filter api run lint` and
  `pnpm --filter api run build`. Verified by all three passing
- [x] 6.3 Run `openspec validate 2026-10-11-the-assistant-names-items-in-the-guests-language`.
  Verified by it passing
- [x] 6.4 Manual check to hand to the user, not run by the agent: on the English
  storefront of a Chinese-default store, ask for a product in English and
  confirm the reply uses the name shown on the product card; then ask in Chinese
  and confirm the reply uses the Chinese name. Verified by the user's
  confirmation
