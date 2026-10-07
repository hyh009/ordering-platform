import type {
  AiOrderingChoiceGroup,
  AiOrderingOperation,
  LocalizedStringDto,
  PublicMenuDto,
  SupportedLocale,
} from '@repo/shared';

/**
 * Every choice a product offers, each with what is selected for it now.
 *
 * Answered choices are described too, not only the open ones. A choice the
 * assistant filled in is exactly the one a guest may need to correct, and a
 * choice the card is never told about is one it cannot show or change.
 *
 * Derived from the menu and the selections on the operation, so the model is
 * never asked for it: "is every choice settled" was the one judgment it could
 * not make reliably, and it is a pure function of data we already hold. Removing
 * it from the model's work is what makes an unoffered optional choice
 * impossible rather than merely discouraged.
 *
 * Ordered required-first, then by the menu's own order, because the guest
 * answers the open ones one at a time and what blocks the order should come
 * first.
 *
 * Labels are localized here. They are menu data and the guest reads them, which
 * is two reasons they are not the model's to write.
 */
export function describeProposalChoices(input: {
  productId: string;
  selections: { modifierId: string; optionId: string }[];
  menu: PublicMenuDto;
  locale: SupportedLocale;
}): AiOrderingChoiceGroup[] {
  const product = findProduct(input.menu, input.productId);

  if (!product) {
    return [];
  }

  const modifiers = new Map(
    input.menu.modifiers.map((modifier) => [modifier.id, modifier]),
  );
  const described: AiOrderingChoiceGroup[] = [];

  for (const modifierId of product.modifierIds) {
    const modifier = modifiers.get(modifierId);

    if (!modifier) {
      continue;
    }

    const options = modifier.options
      // A sold-out option is not an answer the guest can give, so it is not
      // offered. Filtering here rather than in the view keeps "what was
      // offered" and "what is valid" the same list.
      .filter((option) => !option.isSoldOut)
      .map((option) => ({
        optionId: option.id,
        label: localize(option.name, input.locale, option.id),
        priceAdjustment: option.priceAdjustment,
      }));

    if (options.length === 0) {
      continue;
    }

    described.push({
      modifierId,
      label: localize(modifier.name, input.locale, modifierId),
      isRequired: modifier.minSelect > 0,
      minSelect: modifier.minSelect,
      maxSelect: modifier.maxSelect,
      options,
      selectedOptionIds: input.selections
        .filter((selection) => selection.modifierId === modifierId)
        .map((selection) => selection.optionId),
    });
  }

  return [
    ...described.filter((choice) => choice.isRequired),
    ...described.filter((choice) => !choice.isRequired),
  ];
}

function findProduct(menu: PublicMenuDto, productId: string) {
  for (const group of menu.groups) {
    for (const product of group.products) {
      if (product.id === productId) {
        return product;
      }
    }
  }

  return null;
}

function localize(
  value: LocalizedStringDto,
  locale: SupportedLocale,
  fallback: string,
): string {
  return value[locale] ?? Object.values(value).find(Boolean) ?? fallback;
}

export type AiOrderingResolvedChoice = {
  operationId: string;
  modifierId: string;
  optionIds: string[];
};

export type AiOrderingChoiceResolution =
  | {
      ok: true;
      operations: AiOrderingOperation[];
      /**
       * The operations whose choices the guest left different from what was
       * proposed. An answer that repeats the selection already there is not an
       * adjustment, so a card that sends back every choice it showed does not
       * make every operation look corrected.
       */
      adjustedOperationIds: string[];
    }
  | { ok: false; reason: string };

/**
 * Folds the guest's answers into the operations the proposal recorded.
 *
 * This is the point the "ids only, never operation content" rule of
 * `decideAiOrderingProposalSchema` has to be kept at. A caller still cannot add
 * an operation or alter one freely: every answer is matched against a `choices`
 * entry the SERVER wrote on that operation, and an option id that was never
 * offered is refused exactly as an invented operation would be. What the guest
 * is allowed to do is answer a choice the server itself listed — filling one
 * that was open, or changing one the assistant had answered — from the options
 * the server itself sent. Nothing else about the operation can move.
 *
 * An answer REPLACES what was selected for that choice; it is never appended to
 * it. Appending would leave one choice with two answers, the assistant's and the
 * guest's, and the cart would refuse the item or, worse, take both.
 *
 * Every required choice must end up answered, by the guest or by the assistant.
 * The card blocks the button, but the button is not the guarantee: an item may
 * not reach the cart without the choices its product requires.
 */
export function resolveAiOrderingProposalChoices(
  operations: AiOrderingOperation[],
  answers: AiOrderingResolvedChoice[],
): AiOrderingChoiceResolution {
  const resolved: AiOrderingOperation[] = [];
  const adjustedOperationIds: string[] = [];

  for (const operation of operations) {
    const forOperation = answers.filter(
      (answer) => answer.operationId === operation.operationId,
    );

    // A removal has nothing to choose, so an answer aimed at one is a caller
    // that has invented a choice.
    if (operation.type === 'remove_own_item') {
      if (forOperation.length > 0) {
        return {
          ok: false,
          reason: `operation "${operation.operationId}" has no choices to answer`,
        };
      }

      resolved.push(operation);
      continue;
    }

    const {
      choices = [],
      summaryWithoutChoices: _summaryWithoutChoices,
      ...rest
    } = operation;
    const listed = new Set(choices.map((choice) => choice.modifierId));

    for (const answer of forOperation) {
      if (!listed.has(answer.modifierId)) {
        return {
          ok: false,
          reason: `choice "${answer.modifierId}" is not one of the choices on operation "${operation.operationId}"`,
        };
      }
    }

    const selections: { modifierId: string; optionId: string }[] = [];
    let adjusted = false;

    for (const choice of choices) {
      const answer = forOperation.find(
        (candidate) => candidate.modifierId === choice.modifierId,
      );

      if (answer) {
        if (answer.optionIds.length > choice.maxSelect) {
          return {
            ok: false,
            reason: `choice "${choice.modifierId}" takes ${choice.minSelect}-${choice.maxSelect} answers`,
          };
        }

        const offered = new Set(
          choice.options.map((option) => option.optionId),
        );

        for (const optionId of answer.optionIds) {
          if (!offered.has(optionId)) {
            return {
              ok: false,
              reason: `option "${optionId}" was not offered for choice "${choice.modifierId}"`,
            };
          }
        }
      }

      // The guest's answer where they gave one, otherwise what was already
      // selected. Deduplicated because the cart refuses a repeated pair, and a
      // caller sending one twice has not asked for anything different.
      const final = [...new Set(answer?.optionIds ?? choice.selectedOptionIds)];

      // Covers both a required choice nobody answered and an answer that falls
      // short. An optional choice has a minimum of zero, so leaving it alone —
      // or clearing it — is a declined choice, which is an answer.
      if (final.length < choice.minSelect) {
        return {
          ok: false,
          reason: `choice "${choice.modifierId}" must be answered before this can be applied`,
        };
      }

      if (answer && !sameOptions(final, choice.selectedOptionIds)) {
        adjusted = true;
      }

      for (const optionId of final) {
        selections.push({ modifierId: choice.modifierId, optionId });
      }
    }

    if (adjusted) {
      adjustedOperationIds.push(operation.operationId);
    }

    // `choices` is dropped either way: it described what could be answered, and
    // what goes on to the cart is the answer.
    if (forOperation.length === 0) {
      // Untouched, so the operation goes on exactly as it was proposed. In
      // particular an update that did not set the options still does not.
      resolved.push(rest as AiOrderingOperation);
      continue;
    }

    // Selections for a choice that is not listed — one whose every option has
    // sold out — are carried over as they were: the guest was never shown it,
    // so it is not theirs to change, and the cart decides whether it stands.
    const unlisted = (rest.item.selectedOptions ?? []).filter(
      (selection) => !listed.has(selection.modifierId),
    );

    resolved.push({
      ...rest,
      item: {
        ...rest.item,
        selectedOptions: [...unlisted, ...selections],
      },
    } as AiOrderingOperation);
  }

  return { ok: true, operations: resolved, adjustedOperationIds };
}

/** Same options, in any order: a choice's selections are a set. */
function sameOptions(left: string[], right: string[]): boolean {
  const expected = new Set(right);

  return (
    left.length === expected.size &&
    left.every((optionId) => expected.has(optionId))
  );
}
