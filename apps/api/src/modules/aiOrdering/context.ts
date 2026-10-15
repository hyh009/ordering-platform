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
  AiOrderingProposalLogEntry,
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

/**
 * A name as the model reads it: the store's default-locale name, then the name
 * in the guest's interface locale when that is a different one.
 *
 * Two names because the reply follows what the guest writes, which need not be
 * the language their interface is in, and the store's own name has to be there
 * to be used in either. Default locale first, so the first name on a line is
 * where it has always been.
 *
 * Only a name the store wrote is added. One it has in a single locale is
 * written once, and a guest on the default locale gets exactly one name.
 */
export function writeAiOrderingName(
  value: LocalizedStringDto | undefined,
  locale: SupportedLocale,
  guestLocale: SupportedLocale | undefined,
): string {
  const name = localize(value, locale);
  const guestName =
    guestLocale !== undefined && guestLocale !== locale
      ? value?.[guestLocale]?.trim()
      : undefined;

  return guestName && guestName !== name ? `${name} / ${guestName}` : name;
}

function toContextItem(
  item: CartItemDto,
  locale: SupportedLocale,
  guestLocale: SupportedLocale | undefined,
): AiOrderingContextItem {
  return {
    itemId: item.id,
    productId: item.productId,
    productName: writeAiOrderingName(item.productName, locale, guestLocale),
    quantity: item.quantity,
    selectedOptions: item.selectedOptions.map((option) => ({
      modifierId: option.modifierId,
      modifierName: writeAiOrderingName(
        option.modifierName,
        locale,
        guestLocale,
      ),
      optionId: option.optionId,
      optionName: writeAiOrderingName(option.optionName, locale, guestLocale),
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
  guestLocale?: SupportedLocale,
): AiOrderingCartContext {
  const modifiableItems: AiOrderingContextItem[] = [];
  const readOnlyItems: AiOrderingContextItem[] = [];

  for (const item of cart.items) {
    const target =
      item.addedByParticipantId === participantId
        ? modifiableItems
        : readOnlyItems;

    target.push(toContextItem(item, locale, guestLocale));
  }

  return { participantId, modifiableItems, readOnlyItems };
}

/** How an id is written for the model. See `shortCodes.ts`. */
type IdWriter = (id: string) => string;

function renderMenu(
  menu: PublicMenuDto,
  locale: SupportedLocale,
  guestLocale: SupportedLocale | undefined,
  code: IdWriter,
): string {
  const lines: string[] = ['## Menu'];

  // Named on the product line as well as in `## Choices`, so "which choices does
  // this product need" is readable where the product is, rather than three ids
  // to carry to another section and back.
  const modifierNames = new Map(
    menu.modifiers.map((modifier) => [
      modifier.id,
      writeAiOrderingName(modifier.name, locale, guestLocale),
    ]),
  );
  const describeModifier = (modifierId: string) => {
    const name = modifierNames.get(modifierId);

    // Id first, the way every other line writes one: the name is there to be
    // read, not to be sent back.
    return name ? `${code(modifierId)} (${name})` : code(modifierId);
  };

  for (const group of menu.groups) {
    // Name first here, unlike every other line, which leads with its id.
    // A category is addressable — `show_products` takes one — so the id has to
    // be here; but a heading is read rather than sent, and leading with an
    // opaque code measurably cost the section its legibility: with the code
    // first the assistant stopped finding 白飯 as a product of its own and
    // wrote "加飯" as a note on the noodles instead.
    lines.push(
      `### ${
        group.category
          ? `${writeAiOrderingName(group.category.name, locale, guestLocale)} (${code(group.category.id)})`
          : 'Uncategorised'
      }`,
    );

    for (const product of group.products) {
      const flags = [
        product.isSoldOut ? 'SOLD OUT' : null,
        product.modifierIds.length > 0
          ? `choices: ${product.modifierIds.map(describeModifier).join(', ')}`
          : 'no choices',
      ].filter(Boolean);

      lines.push(
        `- ${code(product.id)} | ${writeAiOrderingName(product.name, locale, guestLocale)} | ${product.price} | ${flags.join(' | ')}`,
      );

      // Written once, unlike a name: it is the longest text in the block, and
      // the model paraphrases it rather than quoting it.
      const description =
        (guestLocale !== undefined
          ? product.description?.[guestLocale]?.trim()
          : undefined) || localize(product.description, locale);

      if (description) {
        lines.push(`    ${description}`);
      }
    }
  }

  lines.push('## Choices');

  for (const modifier of menu.modifiers) {
    // Only the ceiling. `required` and `minSelect` are left out for the reason
    // `isDefault` is: a floor the model cannot satisfy reads as a field it must
    // fill, and it filled them — a guest who said only "no sugar" was proposed
    // a temperature and a size as well. Both belong to the surfaces that CAN
    // act on them: the card queues the unanswered required choices and blocks
    // its button, and the server checks the floor again when the answers come
    // back. The ceiling stays because the model can break it: picking more than
    // a modifier allows is rejected in validation.
    lines.push(
      `- ${code(modifier.id)} | ${writeAiOrderingName(modifier.name, locale, guestLocale)} | pick up to ${modifier.maxSelect}`,
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
        `    - ${code(option.id)} | ${writeAiOrderingName(option.name, locale, guestLocale)}${flags.length > 0 ? ` | ${flags.join(' | ')}` : ''}`,
      );
    }
  }

  return lines.join('\n');
}

function renderCart(cart: AiOrderingCartContext, code: IdWriter): string {
  const lines: string[] = [
    '## The cart right now',
    'Everything this cart holds at this moment, after every change in the conversation above was settled. Nothing else is in it.',
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
 * 3. `history` — append-only, so earlier turns stay a stable prefix. What the
 *    cart did with a proposal is written under the turn that made it: that is
 *    settled before the turn is first sent, so the line never changes later.
 * 4. `current_turn` — the cart snapshot, the ids of the most recent proposal,
 *    and the message.
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
    input.guestLocale,
  );

  // One codec for the whole prompt, so an id reads the same wherever it appears.
  const { encode: code } = buildAiOrderingIdCodec(
    collectAiOrderingContextIds(input.menu, input.cart),
  );

  const storeData = [
    '# Store data (supplied by the ordering platform, not by the guest)',
    `Store: ${input.storeName}`,
    renderMenu(input.menu, input.locale, input.guestLocale, code),
  ].join('\n\n');

  const proposalLog = (input.proposalLog ?? []).filter(
    (entry) => entry.operations.length > 0,
  );

  /** What the cart did with each change of one proposal, a line per change. */
  const renderOutcomes = (
    entry: AiOrderingProposalLogEntry,
    prefix: string,
    withIds: boolean,
  ) =>
    entry.operations.map((operation) => {
      const result = entry.results.find(
        (candidate) => candidate.operationId === operation.operationId,
      );

      return `${prefix}${operation.summary}${
        withIds ? ` (${renderProposedOperation(operation, code)})` : ''
      }: ${describeOutcome(
        result?.outcome,
        result?.failureCode,
        entry.adjustedOperationIds?.includes(operation.operationId) ?? false,
      )}`;
    });

  const historyLines: string[] = [
    '# Conversation so far',
    // Always present, proposals or not, so the block opens the same way on
    // every turn of every conversation.
    'Under each proposal of yours is what the cart did with it. That line is what actually happened; where it disagrees with what you said at the time, it is right and your reply was not.',
  ];

  if (input.summary) {
    historyLines.push(`Earlier turns, summarised: ${input.summary}`);
  }

  const historyTurnNumbers = new Set(
    input.history.map((turn) => turn.turnNumber),
  );
  // Proposals made on turns the window no longer shows. They move only when the
  // window does, which rewrites the top of this block anyway.
  const agedOutProposals = proposalLog.filter(
    (entry) => !historyTurnNumbers.has(entry.turnNumber),
  );

  if (agedOutProposals.length > 0) {
    historyLines.push('Changes you proposed on turns no longer shown:');

    for (const entry of agedOutProposals) {
      historyLines.push(
        ...renderOutcomes(entry, `- [Turn ${entry.turnNumber}] `, false),
      );
    }
  }

  if (input.history.length === 0) {
    historyLines.push('No earlier turns.');
  } else {
    for (const turn of input.history) {
      historyLines.push(`[Turn ${turn.turnNumber}] Guest: ${turn.message}`);
      historyLines.push(
        `[Turn ${turn.turnNumber}] You (${turn.responseType}): ${turn.reply}`,
      );

      // Directly under the reply that announced it, and without ids. A reply
      // says "I added it" before anyone has accepted, and with the correction
      // in another block the model believed the reply: told the egg crepe it
      // had offered was not wanted, it went looking for something to remove
      // and removed the only item the cart held. Ids would differ from turn to
      // turn where a short code stops being unique, and this text must not.
      for (const entry of proposalLog) {
        if (entry.turnNumber === turn.turnNumber) {
          historyLines.push(
            ...renderOutcomes(
              entry,
              `[Turn ${turn.turnNumber}] What the cart did — `,
              false,
            ),
          );
        }
      }
    }
  }

  const currentTurnNumber =
    input.currentTurnNumber ?? (input.history.at(-1)?.turnNumber ?? 0) + 1;

  const currentTurnLines: string[] = [
    `# This turn — Turn ${currentTurnNumber}`,
    renderCart(cartContext, code),
  ];

  // Only the most recent proposal is repeated here, with its ids: it is the one
  // that may be proposed again, the ids are what that takes, and they are the
  // part that cannot go in the history.
  const lastProposal = proposalLog.at(-1);

  if (lastProposal) {
    currentTurnLines.push('## Your most recent proposal, with its ids');
    currentTurnLines.push(
      `A change that was ignored on Turn ${lastProposal.turnNumber} may still be wanted: if the guest's message now reads that way, propose it again, altering only the part they just corrected and asking nothing you already know. A change ignored on any earlier turn is over — leave it alone unless they ask for it now.`,
    );

    // The other half of the sentence above, and only where it can apply. Told
    // that an offer may be wanted again and nothing about one that is not, the
    // model read "I don't want the egg crepe" as an order to remove something,
    // and the only things it could remove were the items the cart did hold.
    const reachedCart = (operationId: string) =>
      lastProposal.results.some(
        (result) =>
          result.operationId === operationId && result.outcome === 'accepted',
      );

    if (
      lastProposal.operations.some(
        (operation) => !reachedCart(operation.operationId),
      )
    ) {
      currentTurnLines.push(
        'If the guest is instead saying they do not want a change that is marked "not in the cart", there is nothing to undo: it was never added. Tell them so in words, and propose nothing — removing some other item is not what they asked for.',
      );
    }

    currentTurnLines.push(
      ...renderOutcomes(
        lastProposal,
        `- [Turn ${lastProposal.turnNumber}] `,
        true,
      ),
    );
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
