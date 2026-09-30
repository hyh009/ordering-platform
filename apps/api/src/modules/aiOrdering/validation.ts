import type { CartDto, PublicMenuDto, PublicModifierDto } from '@repo/shared';
import type {
  AiOrderingModelResponse,
  AiOrderingModelOperation,
} from '@src/modules/aiOrdering/modelResponse';

export type AiOrderingOperationRejectionCode =
  | 'product_not_found'
  | 'product_sold_out'
  | 'modifier_invalid'
  | 'not_owned';

export type AiOrderingOperationRejection = {
  /** Index in the model's original operation list, which has no ids yet. */
  index: number;
  code: AiOrderingOperationRejectionCode;
  detail: string;
};

export type AiOrderingValidationResult = {
  /** The surviving operations, in the model's original order. */
  operations: AiOrderingModelOperation[];
  rejections: AiOrderingOperationRejection[];
  /** Attempts to touch another participant's item. A prompt-quality signal. */
  ownershipViolationCount: number;
};

export type AiOrderingValidationInput = {
  menu: PublicMenuDto;
  cart: CartDto;
  participantId: string;
};

type SelectedOption = { modifierId: string; optionId: string };

function indexMenu(menu: PublicMenuDto) {
  const products = new Map(
    menu.groups.flatMap((group) =>
      group.products.map((product) => [product.id, product] as const),
    ),
  );
  const modifiers = new Map(
    menu.modifiers.map((modifier) => [modifier.id, modifier] as const),
  );

  return { products, modifiers };
}

/**
 * Checks a set of option selections against the product's own modifier rules.
 * Returns a human-readable reason, or `null` when the selections are valid.
 */
function findSelectionProblem(
  productModifierIds: string[],
  selections: SelectedOption[],
  modifiers: Map<string, PublicModifierDto>,
): string | null {
  const allowed = new Set(productModifierIds);

  for (const selection of selections) {
    if (!allowed.has(selection.modifierId)) {
      return `modifier "${selection.modifierId}" does not belong to this product`;
    }

    const modifier = modifiers.get(selection.modifierId);

    if (!modifier) {
      return `unknown modifier "${selection.modifierId}"`;
    }

    const option = modifier.options.find(
      (candidate) => candidate.id === selection.optionId,
    );

    if (!option) {
      return `unknown option "${selection.optionId}" for modifier "${selection.modifierId}"`;
    }

    if (option.isSoldOut) {
      // Not something the guest can fix by choosing again on the same proposal,
      // which is why a sold-out option is not treated as a clarification case.
      return `option "${selection.optionId}" is sold out`;
    }
  }

  for (const modifierId of productModifierIds) {
    const modifier = modifiers.get(modifierId);

    if (!modifier) {
      return `unknown modifier "${modifierId}"`;
    }

    const count = selections.filter(
      (selection) => selection.modifierId === modifierId,
    ).length;

    if (count < modifier.minSelect) {
      return `modifier "${modifierId}" requires at least ${modifier.minSelect} selection(s)`;
    }

    if (count > modifier.maxSelect) {
      return `modifier "${modifierId}" allows at most ${modifier.maxSelect} selection(s)`;
    }
  }

  return null;
}

/**
 * Validates proposed operations against real menu and cart state.
 *
 * Four checks, all in-memory against data the caller already loaded to build the
 * model's context: the product exists, it is not sold out, the option selections
 * satisfy the product's modifier rules, and any change targets an item this
 * guest added.
 *
 * Why a proposal is validated BEFORE the guest sees it: in a confirm-then-accept
 * flow the accept button is a promise. An accept that fails is the worst outcome
 * in the interaction, worse than the assistant saying up front that something is
 * unavailable.
 *
 * Runs on the model-shaped response, before ids are assigned, so surviving
 * operations get contiguous ids rather than a list with gaps where rejections
 * used to be.
 */
export function validateAiOrderingOperations(
  modelResponse: AiOrderingModelResponse,
  input: AiOrderingValidationInput,
): AiOrderingValidationResult {
  if (modelResponse.type !== 'proposal') {
    return { operations: [], rejections: [], ownershipViolationCount: 0 };
  }

  const { products, modifiers } = indexMenu(input.menu);
  const cartItems = new Map(
    input.cart.items.map((item) => [item.id, item] as const),
  );

  const operations: AiOrderingModelOperation[] = [];
  const rejections: AiOrderingOperationRejection[] = [];
  let ownershipViolationCount = 0;

  modelResponse.operations.forEach((operation, index) => {
    const reject = (
      code: AiOrderingOperationRejectionCode,
      detail: string,
    ): void => {
      rejections.push({ index, code, detail });
    };

    if (operation.type === 'add_item') {
      const product = products.get(operation.item.productId);

      if (!product) {
        reject(
          'product_not_found',
          `no product "${operation.item.productId}" in this store's menu`,
        );
        return;
      }

      if (product.isSoldOut) {
        reject('product_sold_out', `product "${product.id}" is sold out`);
        return;
      }

      const problem = findSelectionProblem(
        product.modifierIds,
        operation.item.selectedOptions ?? [],
        modifiers,
      );

      if (problem) {
        reject('modifier_invalid', problem);
        return;
      }

      operations.push(operation);
      return;
    }

    const item = cartItems.get(operation.itemId);

    // A missing item and another participant's item are both "not yours to
    // change" from here: neither is something this guest may act on, and the
    // difference is not useful to the model.
    if (!item || item.addedByParticipantId !== input.participantId) {
      ownershipViolationCount += 1;
      reject(
        'not_owned',
        `cart item "${operation.itemId}" was not added by this guest`,
      );
      return;
    }

    if (operation.type === 'remove_own_item') {
      operations.push(operation);
      return;
    }

    if (operation.item.selectedOptions !== undefined) {
      const product = products.get(item.productId);

      if (!product) {
        reject(
          'product_not_found',
          `cart item "${item.id}" references product "${item.productId}", which is no longer on the menu`,
        );
        return;
      }

      const problem = findSelectionProblem(
        product.modifierIds,
        operation.item.selectedOptions,
        modifiers,
      );

      if (problem) {
        reject('modifier_invalid', problem);
        return;
      }
    }

    operations.push(operation);
  });

  return { operations, rejections, ownershipViolationCount };
}
