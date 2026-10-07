import {
  buildAiOrderingIdCodec,
  collectAiOrderingContextIds,
} from '@src/modules/aiOrdering/shortCodes';

import type {
  AiOrderingOperation,
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
    selectedOptions: item.selectedOptions.map((option) => ({
      modifierId: option.modifierId,
      modifierName: localize(option.modifierName, locale),
      optionId: option.optionId,
      optionName: localize(option.optionName, locale),
    })),
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

/** How an id is written for the model. See `shortCodes.ts`. */
type IdWriter = (id: string) => string;

function renderMenu(
  menu: PublicMenuDto,
  locale: SupportedLocale,
  code: IdWriter,
): string {
  const lines: string[] = ['## Menu'];

  // Named on the product line as well as in `## Choices`, so "which choices does
  // this product need" is readable where the product is, rather than three ids
  // to carry to another section and back.
  const modifierNames = new Map(
    menu.modifiers.map((modifier) => [
      modifier.id,
      localize(modifier.name, locale),
    ]),
  );
  const describeModifier = (modifierId: string) => {
    const name = modifierNames.get(modifierId);

    // Id first, the way every other line writes one: the name is there to be
    // read, not to be sent back.
    return name ? `${code(modifierId)} (${name})` : code(modifierId);
  };

  for (const group of menu.groups) {
    lines.push(
      `### ${group.category ? localize(group.category.name, locale) : 'Uncategorised'}`,
    );

    for (const product of group.products) {
      const flags = [
        product.isSoldOut ? 'SOLD OUT' : null,
        product.modifierIds.length > 0
          ? `choices: ${product.modifierIds.map(describeModifier).join(', ')}`
          : 'no choices',
      ].filter(Boolean);

      lines.push(
        `- ${code(product.id)} | ${localize(product.name, locale)} | ${product.price} | ${flags.join(' | ')}`,
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
      `- ${code(modifier.id)} | ${localize(modifier.name, locale)} | ${required} | pick ${modifier.minSelect}-${modifier.maxSelect}`,
    );

    for (const option of modifier.options) {
      const flags = [
        option.isSoldOut ? 'SOLD OUT' : null,
        // `isDefault` is left out on purpose. It is what the menu page
        // preselects, and shown here it reads as the answer to a required
        // choice the guest never made.
        option.priceAdjustment !== 0 ? `+${option.priceAdjustment}` : null,
      ].filter(Boolean);

      lines.push(
        `    - ${code(option.id)} | ${localize(option.name, locale)}${flags.length > 0 ? ` | ${flags.join(' | ')}` : ''}`,
      );
    }
  }

  return lines.join('\n');
}

function renderCart(cart: AiOrderingCartContext, code: IdWriter): string {
  const lines: string[] = [
    '## The cart right now',
    'Everything this cart holds at this moment, after every change below was settled. Nothing else is in it.',
  ];

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
      // Every id is written the way the menu writes one — code first, name in
      // brackets to be read. A change to this line restates the whole set of
      // choices, so the set is spelled out here in the form it is sent back in.
      const choices =
        item.selectedOptions.length > 0
          ? ` | ${item.selectedOptions
              .map(
                (option) =>
                  `${code(option.modifierId)} (${option.modifierName}): ${code(option.optionId)} (${option.optionName})`,
              )
              .join(', ')}`
          : '';
      const notes = item.notes ? ` | note: ${item.notes}` : '';

      lines.push(
        `- ${code(item.itemId)} | ${item.productName} | x${item.quantity}${choices}${notes}`,
      );
    }
  };

  renderItems(
    '### Items you may change — this guest added them',
    cart.modifiableItems,
    'none yet',
  );
  renderItems(
    '### Items you may NOT change — other people sharing this cart added them',
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

  // One codec for the whole prompt, so an id reads the same wherever it appears.
  const { encode: code } = buildAiOrderingIdCodec(
    collectAiOrderingContextIds(input.menu, input.cart),
  );

  const storeData = [
    '# Store data (supplied by the ordering platform, not by the guest)',
    `Store: ${input.storeName}`,
    renderMenu(input.menu, input.locale, code),
  ].join('\n\n');

  const historyLines: string[] = ['# Conversation so far'];

  if (input.summary) {
    historyLines.push(`Earlier turns, summarised: ${input.summary}`);
  }

  if (input.history.length === 0) {
    historyLines.push('No earlier turns.');
  } else {
    // Every line carries its turn number because the proposal log lives in
    // another block and refers back to these turns by number.
    for (const turn of input.history) {
      historyLines.push(`[Turn ${turn.turnNumber}] Guest: ${turn.message}`);
      historyLines.push(
        `[Turn ${turn.turnNumber}] You (${turn.responseType}): ${turn.reply}`,
      );
    }
  }

  const currentTurnNumber =
    input.currentTurnNumber ?? (input.history.at(-1)?.turnNumber ?? 0) + 1;

  const currentTurnLines: string[] = [
    `# This turn — Turn ${currentTurnNumber}`,
    renderCart(cartContext, code),
  ];

  const proposalLog = (input.proposalLog ?? []).filter(
    (entry) => entry.operations.length > 0,
  );

  if (proposalLog.length > 0) {
    const lastTurnNumber = proposalLog.at(-1)?.turnNumber;

    currentTurnLines.push(
      '## Every change you proposed, and what the cart did',
    );
    currentTurnLines.push(
      'Oldest first. This is what the cart actually did; where it disagrees with what you said at the time, this is right and your reply was not.',
    );
    currentTurnLines.push(
      `A change that was ignored on Turn ${lastTurnNumber} may still be wanted: if the guest's message now reads that way, propose it again, altering only the part they just corrected and asking nothing you already know. A change ignored on any earlier turn is over — leave it alone unless they ask for it now.`,
    );

    for (const entry of proposalLog) {
      for (const operation of entry.operations) {
        const result = entry.results.find(
          (candidate) => candidate.operationId === operation.operationId,
        );
        // Ids only on the most recent proposal, which is the only one that may
        // be proposed again: that is what the ids are for, and spelling them out
        // for every settled change would be the longest block in the prompt.
        const detail =
          entry.turnNumber === lastTurnNumber
            ? ` (${renderProposedOperation(operation, code)})`
            : '';

        currentTurnLines.push(
          `- [Turn ${entry.turnNumber}] ${operation.summary}${detail}: ${describeOutcome(
            result?.outcome,
            result?.failureCode,
            entry.adjustedOperationIds?.includes(operation.operationId) ??
              false,
          )}`,
        );
      }
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
 * One proposed operation as the model wrote it, ids included.
 *
 * Ids — in the same short form the menu uses — rather than names, because this
 * is what the model needs to act on the
 * outcome: offering a lapsed change again means sending the same product and
 * option ids, and the menu block above already says what each one is called.
 * Only the fields the operation carries are listed, so an update reads as the
 * change it made rather than as the item it touched.
 */
function renderProposedOperation(
  operation: AiOrderingOperation,
  code: IdWriter,
): string {
  const parts: string[] = [operation.operationId, operation.type];

  if (operation.type === 'add_item') {
    parts.push(`product ${code(operation.item.productId)}`);
  } else {
    parts.push(`item ${code(operation.itemId)}`);
  }

  if (operation.type !== 'remove_own_item') {
    const { quantity, selectedOptions, notes } = operation.item;

    if (quantity !== undefined) {
      parts.push(`x${quantity}`);
    }

    if (selectedOptions !== undefined) {
      parts.push(
        selectedOptions.length > 0
          ? `choices: ${selectedOptions
              .map(
                (selection) =>
                  `${code(selection.modifierId)}=${code(selection.optionId)}`,
              )
              .join(', ')}`
          : 'no choices',
      );
    }

    if (notes === null) {
      parts.push('note removed');
    } else if (notes !== undefined) {
      parts.push(`note: ${notes}`);
    }
  }

  return parts.join(' | ');
}

/**
 * How one proposed change ended, in as few words as carry the difference.
 *
 * The five outcomes are not interchangeable: a refusal to respect, a proposal
 * the guest walked past, one an earlier failure stopped short of, and one that
 * was attempted and would not apply are four different facts, and collapsing
 * any two makes the next reply wrong. What each one means for the NEXT turn is
 * stated once in the section's opening lines instead of being repeated on every
 * row, which is what these strings used to do.
 */
function describeOutcome(
  outcome: string | undefined,
  failureCode: string | undefined,
  /**
   * The guest changed a choice on it before accepting. The line already shows
   * their version; this says so, because otherwise the model reads its own
   * mistake back as something it got right.
   */
  adjustedByGuest: boolean,
): string {
  switch (outcome) {
    case 'accepted':
      return adjustedByGuest
        ? 'the guest changed the choices you proposed, then accepted it — it is in the cart as written here'
        : 'the guest accepted it — it is in the cart';
    case 'rejected':
      return 'the guest refused it — not in the cart';
    case 'superseded':
      return 'the guest ignored it — not in the cart';
    case 'no_action':
      return 'accepted, but an earlier failure stopped the proposal before it — not in the cart';
    case 'failed':
      return `accepted, but it would not apply${failureCode ? ` (${failureCode})` : ''} — not in the cart`;
    default:
      // No decision was recorded against it, which only a data fault or the
      // instant between claiming and writing one produces.
      return 'no recorded outcome — not in the cart';
  }
}
