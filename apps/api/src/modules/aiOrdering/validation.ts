import type { CartDto, PublicMenuDto, PublicModifierDto } from '@repo/shared';
import type {
  AiOrderingModelResponse,
  AiOrderingModelOperation,
} from '@src/modules/aiOrdering/modelResponse';

export type AiOrderingOperationRejectionCode =
  | 'product_not_found'
  | 'product_sold_out'
  | 'modifier_invalid'
  | 'not_owned'
  | 'no_change'
  | 'line_written_twice';

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

/** Order carries no meaning in a selection, so equality is set equality. */
function sameSelections(
  proposed: SelectedOption[],
  current: { modifierId: string; optionId: string }[],
): boolean {
  if (proposed.length !== current.length) return false;

  const key = (option: SelectedOption) =>
    `${option.modifierId}:${option.optionId}`;
  const currentKeys = new Set(current.map(key));

  return proposed.every((option) => currentKeys.has(key(option)));
}

/**
 * Why an update would change nothing, or `null` when it would change something.
 *
 * An absent field means "leave this alone", so only the fields the model
 * actually supplied are compared. The operation is empty when every one of them
 * already matches the item — including `notes: null` against an item that has no
 * note, which is a request to clear nothing.
 */
function describeEmptyUpdate(
  update: {
    quantity?: number | undefined;
    selectedOptions?: SelectedOption[] | undefined;
    notes?: string | null | undefined;
  },
  item: CartDto['items'][number],
): string | null {
  const unchanged: string[] = [];

  if (update.quantity !== undefined) {
    if (update.quantity !== item.quantity) return null;
    unchanged.push(`quantity is already ${String(item.quantity)}`);
  }

  if (update.selectedOptions !== undefined) {
    if (
      !sameSelections(
        update.selectedOptions,
        item.selectedOptions.map((option) => ({
          modifierId: option.modifierId,
          optionId: option.optionId,
        })),
      )
    ) {
      return null;
    }

    unchanged.push('the options are already exactly those');
  }

  if (update.notes !== undefined) {
    const current = item.notes;

    if (update.notes === null) {
      if (current !== undefined) return null;
      unchanged.push('there is no note to remove');
    } else {
      if (update.notes !== current) return null;
      unchanged.push('the note already says that');
    }
  }

  if (unchanged.length === 0) {
    // Nothing supplied at all. The shared schema refuses this, so reaching here
    // means the shapes have drifted; say so rather than letting it through.
    return 'it supplies no field to change';
  }

  return `it changes nothing: ${unchanged.join(', ')}`;
}

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
 *
 * Incomplete is not invalid. The model is asked only for the choices the guest
 * actually stated, so a product whose choices are not all answered is the normal
 * case and not an error; what is rejected is a selection that is wrong.
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

    // A choice the guest has not made is NOT rejected here. It is reported to
    // them as an open choice on the proposal and answered in the cart card,
    // which is a tap instead of another model call — and it is why offering an
    // optional choice no longer depends on the model remembering to. Only the
    // guest can settle a choice, so the only thing checked here is that nothing
    // was settled WRONGLY. `describeProposalChoices` reports what is left.
    if (count > modifier.maxSelect) {
      return `modifier "${modifierId}" allows at most ${modifier.maxSelect} selection(s)`;
    }
  }

  return null;
}

/**
 * Validates proposed operations against real menu and cart state.
 *
 * Five checks, all in-memory against data the caller already loaded to build the
 * model's context: the product exists, it is not sold out, every option
 * selection the model DID make is legal for the product, any change targets an
 * item this guest added, and no two operations write to the same cart line. A
 * choice left unanswered is not a rejection: see `findSelectionProblem`.
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
  /**
   * Cart lines a surviving operation already writes to.
   *
   * Only the survivors count: if the first operation on a line was rejected,
   * the second is the only one left and is free to stand.
   */
  const writtenItemIds = new Set<string>();

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

    // A cart line is one entry with a quantity, so two operations on the same
    // line are two writes to one row: the later one wins and the earlier is
    // reported `accepted` to a guest it never happened for. Seen when the model
    // was asked to change part of a line and answered with the line set to one
    // quantity and then to another, which would have dropped a cup the guest
    // asked for. The detail names the shape that does work, because the repair
    // attempt is the model's only chance to read it.
    if (writtenItemIds.has(operation.itemId)) {
      reject(
        'line_written_twice',
        `cart item "${operation.itemId}" is already changed by an earlier operation in this proposal. A change applies to the line's whole quantity. To give part of a line something different, use ONE update that leaves the rest on this line, and add the part that differs as a separate add_item.`,
      );
      return;
    }

    if (operation.type === 'remove_own_item') {
      writtenItemIds.add(operation.itemId);
      operations.push(operation);
      return;
    }

    const emptiness = describeEmptyUpdate(operation.item, item);

    if (emptiness) {
      // Valid against the menu, valid against the cart, and pointless. Without
      // this it reaches the guest as an action and reports success — which is
      // how an assistant once announced a note it never specified, over an
      // operation that only restated the quantity the item already had.
      reject('no_change', emptiness);
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

    writtenItemIds.add(operation.itemId);
    operations.push(operation);
  });

  return { operations, rejections, ownershipViolationCount };
}
