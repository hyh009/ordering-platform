import type {
  CartDto,
  CartItemDto,
  LocalizedStringDto,
  PublicMenuDto,
  SupportedLocale,
} from '@repo/shared';
import type {
  AiOrderingAssembledContext,
  AiOrderingCartContext,
  AiOrderingContextInput,
  AiOrderingContextItem,
} from '@src/modules/aiOrdering/types';

function localize(
  value: LocalizedStringDto | undefined,
  locale: SupportedLocale,
): string {
  if (!value) {
    return '';
  }

  return value[locale] ?? Object.values(value).find(Boolean) ?? '';
}

function toContextItem(
  item: CartItemDto,
  locale: SupportedLocale,
): AiOrderingContextItem {
  return {
    itemId: item.id,
    productId: item.productId,
    productName: localize(item.productName, locale),
    quantity: item.quantity,
    selectedOptionLabels: item.selectedOptions.map(
      (option) =>
        `${localize(option.modifierName, locale)}: ${localize(option.optionName, locale)}`,
    ),
    ...(item.notes !== undefined ? { notes: item.notes } : {}),
  };
}

/**
 * Splits the cart into what this guest may change and what they may only read.
 *
 * Ownership is decided here, once, from `addedByParticipantId`, so the model is
 * handed two lists instead of one list plus a rule it has to remember. The
 * validation stage repeats the check against the same data, because a prompt is
 * guidance and a check is a guarantee.
 */
export function buildAiOrderingCartContext(
  cart: CartDto,
  participantId: string,
  locale: SupportedLocale,
): AiOrderingCartContext {
  const modifiableItems: AiOrderingContextItem[] = [];
  const readOnlyItems: AiOrderingContextItem[] = [];

  for (const item of cart.items) {
    const target =
      item.addedByParticipantId === participantId
        ? modifiableItems
        : readOnlyItems;

    target.push(toContextItem(item, locale));
  }

  return { participantId, modifiableItems, readOnlyItems };
}

function renderMenu(menu: PublicMenuDto, locale: SupportedLocale): string {
  const lines: string[] = ['## Menu'];

  for (const group of menu.groups) {
    lines.push(
      `### ${group.category ? localize(group.category.name, locale) : 'Uncategorised'}`,
    );

    for (const product of group.products) {
      const flags = [
        product.isSoldOut ? 'SOLD OUT' : null,
        product.modifierIds.length > 0
          ? `choices: ${product.modifierIds.join(', ')}`
          : 'no choices',
      ].filter(Boolean);

      lines.push(
        `- ${product.id} | ${localize(product.name, locale)} | ${product.price} | ${flags.join(' | ')}`,
      );

      const description = localize(product.description, locale);

      if (description) {
        lines.push(`    ${description}`);
      }
    }
  }

  lines.push('## Choices');

  for (const modifier of menu.modifiers) {
    const required = modifier.minSelect > 0 ? 'required' : 'optional';

    lines.push(
      `- ${modifier.id} | ${localize(modifier.name, locale)} | ${required} | pick ${modifier.minSelect}-${modifier.maxSelect}`,
    );

    for (const option of modifier.options) {
      const flags = [
        option.isSoldOut ? 'SOLD OUT' : null,
        option.isDefault ? 'default' : null,
        option.priceAdjustment !== 0 ? `+${option.priceAdjustment}` : null,
      ].filter(Boolean);

      lines.push(
        `    - ${option.id} | ${localize(option.name, locale)}${flags.length > 0 ? ` | ${flags.join(' | ')}` : ''}`,
      );
    }
  }

  return lines.join('\n');
}

function renderCart(cart: AiOrderingCartContext): string {
  const lines: string[] = ['## Cart'];

  const renderItems = (
    heading: string,
    items: AiOrderingContextItem[],
    empty: string,
  ) => {
    lines.push(heading);

    if (items.length === 0) {
      lines.push(`- ${empty}`);
      return;
    }

    for (const item of items) {
      const choices =
        item.selectedOptionLabels.length > 0
          ? ` | ${item.selectedOptionLabels.join(', ')}`
          : '';
      const notes = item.notes ? ` | note: ${item.notes}` : '';

      lines.push(
        `- ${item.itemId} | ${item.productName} | x${item.quantity}${choices}${notes}`,
      );
    }
  };

  renderItems(
    '### Items you may change (added by this guest)',
    cart.modifiableItems,
    'none',
  );
  renderItems(
    '### Items you may NOT change (added by other people)',
    cart.readOnlyItems,
    'none',
  );

  return lines.join('\n');
}

/**
 * Assembles the model input, most-static content first.
 *
 * The order is what makes the provider's implicit prefix cache usable, and it is
 * ordered by how often each part changes rather than by how it reads:
 *
 * 1. `core_instructions` — identical for every request on this version.
 * 2. `store_data` — identical for every guest of this store until the menu
 *    changes, so the cached prefix is shared ACROSS conversations.
 * 3. `history` — append-only, so earlier turns stay a stable prefix.
 * 4. `current_turn` — the cart snapshot, any reported outcomes, and the message.
 *
 * The cart snapshot is the most volatile input and therefore goes last. Putting
 * it before the history — the more natural reading order — would invalidate the
 * cache on every single turn.
 */
export function buildAiOrderingContext(
  input: AiOrderingContextInput,
): AiOrderingAssembledContext {
  const cartContext = buildAiOrderingCartContext(
    input.cart,
    input.participantId,
    input.locale,
  );

  const storeData = [
    '# Store data (supplied by the ordering platform, not by the guest)',
    `Store: ${input.storeName}`,
    renderMenu(input.menu, input.locale),
  ].join('\n\n');

  const historyLines: string[] = ['# Conversation so far'];

  if (input.summary) {
    historyLines.push(`Earlier turns, summarised: ${input.summary}`);
  }

  if (input.history.length === 0) {
    historyLines.push('No earlier turns.');
  } else {
    for (const turn of input.history) {
      historyLines.push(`Guest: ${turn.message}`);
      historyLines.push(`You (${turn.responseType}): ${turn.reply}`);
    }
  }

  const currentTurnLines: string[] = ['# This turn', renderCart(cartContext)];

  if (input.reportedOutcomes && input.reportedOutcomes.length > 0) {
    currentTurnLines.push('## What happened to your last proposal');
    currentTurnLines.push(
      'This is what the cart actually did. Where it disagrees with what you said last turn, this is right and your reply was not.',
    );

    for (const result of input.reportedOutcomes) {
      currentTurnLines.push(
        `- ${result.operationId}: ${describeOutcome(result.outcome, result.failureCode)}`,
      );
    }
  }

  if (input.resolvedPrompt) {
    currentTurnLines.push('## The guest is answering your question');
    currentTurnLines.push(`You asked: ${input.resolvedPrompt.question}`);
    currentTurnLines.push(
      input.resolvedPrompt.selectedOption
        ? `They chose: ${input.resolvedPrompt.selectedOption.label}`
        : 'They did not pick any of the options and typed an answer instead.',
    );
  }

  currentTurnLines.push('## Guest message');
  currentTurnLines.push(input.message);

  return {
    versionId: input.config.versionId,
    blocks: [
      {
        kind: 'core_instructions',
        role: 'system',
        text: input.config.coreInstructions,
      },
      { kind: 'store_data', role: 'user', text: storeData },
      { kind: 'history', role: 'user', text: historyLines.join('\n') },
      { kind: 'current_turn', role: 'user', text: currentTurnLines.join('\n') },
    ],
  };
}

/**
 * The four non-acceptances must read differently to the model. A refusal it
 * should respect, a proposal the guest never answered, one an earlier failure
 * stopped it from reaching, and one that was attempted and would not apply are
 * four different facts, and collapsing any two makes the next reply wrong.
 */
function describeOutcome(
  outcome: string,
  failureCode: string | undefined,
): string {
  switch (outcome) {
    case 'accepted':
      return 'the guest accepted it and it is now in the cart';
    case 'rejected':
      return 'the guest dismissed it — do not propose it again unless they ask';
    case 'superseded':
      return 'the guest never answered it and the cart did NOT change — it is not in the cart, so do not treat it as done; offer it again if they still seem to want it';
    case 'no_action':
      return 'the guest accepted it but an earlier failure stopped the proposal before this one was attempted, so it is not in the cart';
    case 'failed':
      return `the guest accepted it but it could not be applied${failureCode ? ` (${failureCode})` : ''}`;
    default:
      return outcome;
  }
}
