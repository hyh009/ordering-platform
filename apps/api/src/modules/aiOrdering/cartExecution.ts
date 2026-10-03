import { ERROR_CODES } from '@src/utils/errorCode';
import { AppError } from '@src/utils/errors';

import type { AiOrderingOperation, AiOrderingOperationResult } from '@repo/shared';
import type { ErrorCode } from '@src/utils/errorCode';

/**
 * Whether a failure stops the rest of the proposal.
 *
 * `item` means this one operation cannot be done but the next one still can — a
 * sold-out product, an item that is gone. `session` means the cart itself is no
 * longer writable, so attempting the remaining operations would produce N copies
 * of the same error and N chances to confuse the guest about which one is the
 * real problem.
 *
 * Exhaustive over the codes the guest cart path can throw, so adding one is a
 * decision rather than a default.
 */
const FAILURE_SCOPE: Partial<Record<ErrorCode, 'item' | 'session'>> = {
  [ERROR_CODES.PRODUCT_SOLD_OUT]: 'item',
  [ERROR_CODES.PRODUCT_NOT_FOUND]: 'item',
  [ERROR_CODES.CART_ITEM_NOT_FOUND]: 'item',
  [ERROR_CODES.MODIFIER_SELECTION_INVALID]: 'item',
  [ERROR_CODES.NOT_ITEM_OWNER]: 'item',
  [ERROR_CODES.BAD_REQUEST]: 'item',
  [ERROR_CODES.CART_NOT_ACTIVE]: 'session',
  [ERROR_CODES.CART_NOT_FOUND]: 'session',
  [ERROR_CODES.ORDER_LOCKED]: 'session',
  [ERROR_CODES.ORDER_NOT_FOUND]: 'session',
  [ERROR_CODES.ORDER_TYPE_NOT_ENABLED]: 'session',
  [ERROR_CODES.STORE_NOT_OPEN]: 'session',
  [ERROR_CODES.INVALID_GUEST_TOKEN]: 'session',
  [ERROR_CODES.CONFLICT]: 'session',
};

export type AiOrderingExecutionFailure = {
  /** A stable code, never raw error text: the guest and the model both read it. */
  failureCode: ErrorCode;
  scope: 'item' | 'session';
};

/**
 * Classifies a thrown cart error.
 *
 * Anything that is not an `AppError` is a defect on our side rather than a
 * refusal by the cart, so it stops the proposal: continuing would risk repeating
 * whatever went wrong against every remaining operation.
 */
export function classifyAiOrderingCartFailure(
  error: unknown,
): AiOrderingExecutionFailure {
  if (!(error instanceof AppError)) {
    return { failureCode: ERROR_CODES.INTERNAL_SERVER_ERROR, scope: 'session' };
  }

  return {
    failureCode: error.code,
    // An unmapped code is treated as session-scoped on purpose. The cost of
    // stopping early is one extra round trip for the guest; the cost of carrying
    // on through an unknown failure is N identical errors.
    scope: FAILURE_SCOPE[error.code] ?? 'session',
  };
}

export type AiOrderingCartExecutor = {
  addItem(operation: Extract<AiOrderingOperation, { type: 'add_item' }>): Promise<void>;
  updateItem(
    operation: Extract<AiOrderingOperation, { type: 'update_own_item' }>,
  ): Promise<void>;
  removeItem(
    operation: Extract<AiOrderingOperation, { type: 'remove_own_item' }>,
  ): Promise<void>;
};

/**
 * Runs an accepted proposal's operations in the order they were proposed.
 *
 * Every operation gets a result, including the ones a session-scoped failure
 * stopped from being attempted. An operation with no result would be an outcome
 * the assistant has to infer from absence, and "the guest said no" and "we never
 * tried" are not the same thing to say back.
 *
 * Nothing is rolled back. A guest who watched two items land in the cart should
 * not see them vanish because a third failed; the response reports all three.
 */
export async function executeAiOrderingOperations(
  operations: AiOrderingOperation[],
  executor: AiOrderingCartExecutor,
): Promise<AiOrderingOperationResult[]> {
  const results: AiOrderingOperationResult[] = [];
  let stopped = false;

  for (const operation of operations) {
    if (stopped) {
      results.push({ operationId: operation.operationId, outcome: 'no_action' });
      continue;
    }

    try {
      switch (operation.type) {
        case 'add_item':
          await executor.addItem(operation);
          break;
        case 'update_own_item':
          await executor.updateItem(operation);
          break;
        case 'remove_own_item':
          await executor.removeItem(operation);
          break;
      }

      results.push({ operationId: operation.operationId, outcome: 'accepted' });
    } catch (error) {
      const failure = classifyAiOrderingCartFailure(error);

      results.push({
        operationId: operation.operationId,
        outcome: 'failed',
        failureCode: failure.failureCode,
      });

      stopped = failure.scope === 'session';
    }
  }

  return results;
}
