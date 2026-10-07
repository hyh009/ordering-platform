/**
 * Short codes for the ids the model reads and writes back.
 *
 * Every product, modifier, option and cart item id is a prefix plus a UUID, and
 * the model has to copy each one out of the menu and into an operation without
 * changing a character. A 36-character id costs tokens on every line of the menu
 * and is easy to get wrong; the first eight hex digits identify the same thing
 * within one store.
 *
 * The code is DERIVED from the id, never assigned in order. A numbered code
 * means something different whenever the menu is reordered or an item is added,
 * so a code the model carried over from an earlier turn would silently point at
 * a different product. A derived code points at the same id or at nothing, and
 * "nothing" is what validation already catches.
 *
 * Two ids that share their first eight digits both keep their full id. That is
 * decided per turn, from the menu and cart the model is shown that turn.
 */

import type { CartDto, PublicMenuDto } from '@repo/shared';
import type { AiOrderingModelResponse } from '@src/modules/aiOrdering/modelResponse';

const UUID_SUFFIX =
  /([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AiOrderingIdCodec = {
  /** The code the model is shown for an id, or the id itself when it has none. */
  encode(id: string): string;
  /** The id a code stands for, or the input unchanged when it is not a code. */
  decode(code: string): string;
  /** Rewrites every quoted id in a sentence, for text the model will read. */
  encodeText(text: string): string;
};

export function buildAiOrderingIdCodec(
  ids: Iterable<string>,
): AiOrderingIdCodec {
  const known = new Set(ids);
  const idsByCode = new Map<string, string[]>();

  for (const id of known) {
    const code = UUID_SUFFIX.exec(id)?.[1]?.toLowerCase();

    // An id with no UUID in it is left alone: there is nothing to derive from.
    if (code !== undefined) {
      idsByCode.set(code, [...(idsByCode.get(code) ?? []), id]);
    }
  }

  const codeById = new Map<string, string>();
  const idByCode = new Map<string, string>();

  for (const [code, sharing] of idsByCode) {
    const [id] = sharing;

    // Shared by two ids, or spelled the same as a whole id: either way the code
    // would be ambiguous, so every id involved keeps its full form.
    if (sharing.length === 1 && id !== undefined && !known.has(code)) {
      codeById.set(id, code);
      idByCode.set(code, id);
    }
  }

  const encode = (id: string) => codeById.get(id) ?? id;

  return {
    encode,
    decode: (code) => idByCode.get(code.toLowerCase()) ?? code,
    encodeText: (text) =>
      text.replace(/"([^"]+)"/g, (_, quoted: string) => `"${encode(quoted)}"`),
  };
}

/** Every id the model is shown in one turn: the menu's and the cart's. */
export function collectAiOrderingContextIds(
  menu: PublicMenuDto,
  cart: CartDto,
): string[] {
  return [
    // A category is addressable too: `show_products` takes one, so its id has
    // to survive the round trip the same way a product's does.
    ...menu.groups.flatMap((group) =>
      group.category ? [group.category.id] : [],
    ),
    ...menu.groups.flatMap((group) =>
      group.products.map((product) => product.id),
    ),
    ...menu.modifiers.flatMap((modifier) => [
      modifier.id,
      ...modifier.options.map((option) => option.id),
    ]),
    ...cart.items.map((item) => item.id),
  ];
}

/**
 * Turns the codes in a model answer back into ids.
 *
 * Done once, straight after the output gate, so validation, hydration, the
 * labels and the cart all work on real ids and nothing downstream knows codes
 * exist. A code that matches nothing is left as the model wrote it, which
 * validation then rejects as an id that is not on the menu.
 */
export function decodeAiOrderingModelResponse(
  modelResponse: AiOrderingModelResponse,
  codec: AiOrderingIdCodec,
): AiOrderingModelResponse {
  const decodeSelections = <T extends { modifierId: string; optionId: string }>(
    selections: T[] | undefined,
  ) =>
    selections?.map((selection) => ({
      ...selection,
      modifierId: codec.decode(selection.modifierId),
      optionId: codec.decode(selection.optionId),
    }));

  if (modelResponse.type === 'unanswered') {
    return modelResponse.productId === undefined
      ? modelResponse
      : { ...modelResponse, productId: codec.decode(modelResponse.productId) };
  }

  if (modelResponse.type === 'products') {
    return {
      ...modelResponse,
      ...(modelResponse.categoryId !== undefined
        ? { categoryId: codec.decode(modelResponse.categoryId) }
        : {}),
      ...(modelResponse.productIds !== undefined
        ? { productIds: modelResponse.productIds.map((id) => codec.decode(id)) }
        : {}),
    };
  }

  if (modelResponse.type !== 'proposal') {
    return modelResponse;
  }

  return {
    ...modelResponse,
    operations: modelResponse.operations.map((operation) => {
      if (operation.type === 'remove_own_item') {
        return { ...operation, itemId: codec.decode(operation.itemId) };
      }

      const selectedOptions = decodeSelections(operation.item.selectedOptions);

      if (operation.type === 'add_item') {
        return {
          ...operation,
          item: {
            ...operation.item,
            productId: codec.decode(operation.item.productId),
            ...(selectedOptions !== undefined ? { selectedOptions } : {}),
          },
        };
      }

      return {
        ...operation,
        itemId: codec.decode(operation.itemId),
        item: {
          ...operation.item,
          ...(selectedOptions !== undefined ? { selectedOptions } : {}),
        },
      };
    }),
  };
}
