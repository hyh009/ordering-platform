import { describe, expect, it, vi } from 'vitest';

import {
  classifyAiOrderingCartFailure,
  executeAiOrderingOperations,
} from '../src/modules/aiOrdering/cartExecution.js';
import { ERROR_CODES } from '../src/utils/errorCode.js';
import {
  AppError,
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../src/utils/errors.js';

import type { AiOrderingCartExecutor } from '../src/modules/aiOrdering/cartExecution.js';
import type { AiOrderingOperation } from '@repo/shared';

function addItem(operationId: string): AiOrderingOperation {
  return {
    type: 'add_item',
    operationId,
    summary: `add ${operationId}`,
    item: { productId: `product-${operationId}`, quantity: 1 },
  };
}

function executor(
  overrides: Partial<AiOrderingCartExecutor> = {},
): AiOrderingCartExecutor {
  return {
    addItem: vi.fn(async () => undefined),
    updateItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('AI ordering cart execution', () => {
  it('applies every operation in the order proposed', async () => {
    const seen: string[] = [];
    const results = await executeAiOrderingOperations(
      [addItem('op-1'), addItem('op-2'), addItem('op-3')],
      executor({
        addItem: vi.fn(async (operation) => {
          seen.push(operation.operationId);
        }),
      }),
    );

    expect(seen).toEqual(['op-1', 'op-2', 'op-3']);
    expect(results.map((result) => result.outcome)).toEqual([
      'accepted',
      'accepted',
      'accepted',
    ]);
  });

  it('leaves an earlier success in the cart when a later operation fails', async () => {
    const results = await executeAiOrderingOperations(
      [addItem('op-1'), addItem('op-2'), addItem('op-3')],
      executor({
        addItem: vi.fn(async (operation) => {
          if (operation.operationId === 'op-2') {
            throw new NotFoundError('sold out', ERROR_CODES.PRODUCT_SOLD_OUT);
          }
        }),
      }),
    );

    // Nothing is undone. A guest who watched the first item land should not see
    // it vanish because a later one failed.
    expect(results).toEqual([
      { operationId: 'op-1', outcome: 'accepted' },
      {
        operationId: 'op-2',
        outcome: 'failed',
        failureCode: ERROR_CODES.PRODUCT_SOLD_OUT,
      },
      // Item-scoped: the third is still attempted.
      { operationId: 'op-3', outcome: 'accepted' },
    ]);
  });

  it('stops after a session-scoped failure and reports the rest as untried', async () => {
    const add = vi.fn(async (operation: { operationId: string }) => {
      if (operation.operationId === 'op-1') {
        throw new ConflictError('cart is locked', ERROR_CODES.ORDER_LOCKED);
      }
    });

    const results = await executeAiOrderingOperations(
      [addItem('op-1'), addItem('op-2'), addItem('op-3')],
      executor({ addItem: add as AiOrderingCartExecutor['addItem'] }),
    );

    // A locked cart would refuse all three identically. One error, not three.
    expect(add).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      {
        operationId: 'op-1',
        outcome: 'failed',
        failureCode: ERROR_CODES.ORDER_LOCKED,
      },
      { operationId: 'op-2', outcome: 'no_action' },
      { operationId: 'op-3', outcome: 'no_action' },
    ]);
  });

  describe('a concurrent cart write', () => {
    const concurrentWrite = () =>
      new ConflictError(
        'Cart was modified concurrently, please retry',
        ERROR_CODES.CONFLICT,
      );

    it('is tried again, and the operation lands', async () => {
      let calls = 0;
      const add = vi.fn(async () => {
        calls += 1;

        if (calls === 1) {
          throw concurrentWrite();
        }
      });
      const wait = vi.fn(async () => undefined);

      const results = await executeAiOrderingOperations(
        [addItem('op-1'), addItem('op-2')],
        executor({ addItem: add as AiOrderingCartExecutor['addItem'] }),
        { wait },
      );

      // Several people writing to a shared cart in the same instant passes on
      // its own. Giving up here would stop the whole proposal over a collision.
      expect(results).toEqual([
        { operationId: 'op-1', outcome: 'accepted' },
        { operationId: 'op-2', outcome: 'accepted' },
      ]);
      expect(add).toHaveBeenCalledTimes(3);
      expect(wait).toHaveBeenCalledTimes(1);
    });

    it('is reported as a failure once the retries run out', async () => {
      const add = vi.fn(async () => {
        throw concurrentWrite();
      });
      const wait = vi.fn(async () => undefined);

      const results = await executeAiOrderingOperations(
        [addItem('op-1'), addItem('op-2')],
        executor({ addItem: add as AiOrderingCartExecutor['addItem'] }),
        { wait },
      );

      // Bounded: three tries for the one operation, then the proposal stops.
      expect(add).toHaveBeenCalledTimes(3);
      expect(wait).toHaveBeenCalledTimes(2);
      expect(results).toEqual([
        {
          operationId: 'op-1',
          outcome: 'failed',
          failureCode: ERROR_CODES.CONFLICT,
        },
        { operationId: 'op-2', outcome: 'no_action' },
      ]);
    });

    it('does not retry a refusal that would fail the same way again', async () => {
      const add = vi.fn(async () => {
        throw new ConflictError(
          'Product is sold out',
          ERROR_CODES.PRODUCT_SOLD_OUT,
        );
      });
      const wait = vi.fn(async () => undefined);

      await executeAiOrderingOperations(
        [addItem('op-1')],
        executor({ addItem: add as AiOrderingCartExecutor['addItem'] }),
        { wait },
      );

      // Same error class, different code. Only a lost write is worth repeating.
      expect(add).toHaveBeenCalledTimes(1);
      expect(wait).not.toHaveBeenCalled();
    });
  });

  it('gives every operation a result, so none has to be inferred from absence', async () => {
    const operations = [addItem('op-1'), addItem('op-2'), addItem('op-3')];
    const results = await executeAiOrderingOperations(
      operations,
      executor({
        addItem: vi.fn(async () => {
          throw new ConflictError('cart is locked', ERROR_CODES.ORDER_LOCKED);
        }),
      }),
    );

    expect(results).toHaveLength(operations.length);
    expect(results.map((result) => result.operationId)).toEqual([
      'op-1',
      'op-2',
      'op-3',
    ]);
  });

  it('routes each operation type to its own cart call', async () => {
    const calls = executor();

    await executeAiOrderingOperations(
      [
        addItem('op-1'),
        {
          type: 'update_own_item',
          operationId: 'op-2',
          summary: 'make it two',
          itemId: 'item-1',
          item: { quantity: 2 },
        },
        {
          type: 'remove_own_item',
          operationId: 'op-3',
          summary: 'drop it',
          itemId: 'item-2',
        },
      ],
      calls,
    );

    expect(calls.addItem).toHaveBeenCalledTimes(1);
    expect(calls.updateItem).toHaveBeenCalledTimes(1);
    expect(calls.removeItem).toHaveBeenCalledTimes(1);
  });

  describe('failure classification', () => {
    it.each([
      [ERROR_CODES.PRODUCT_SOLD_OUT, 'item'],
      [ERROR_CODES.PRODUCT_NOT_FOUND, 'item'],
      [ERROR_CODES.CART_ITEM_NOT_FOUND, 'item'],
      [ERROR_CODES.MODIFIER_SELECTION_INVALID, 'item'],
      [ERROR_CODES.NOT_ITEM_OWNER, 'item'],
      [ERROR_CODES.BAD_REQUEST, 'item'],
      [ERROR_CODES.CART_NOT_ACTIVE, 'session'],
      [ERROR_CODES.CART_NOT_FOUND, 'session'],
      [ERROR_CODES.ORDER_LOCKED, 'session'],
      [ERROR_CODES.STORE_NOT_OPEN, 'session'],
      [ERROR_CODES.INVALID_GUEST_TOKEN, 'session'],
    ])('classifies %s as %s-scoped', (code, scope) => {
      expect(
        classifyAiOrderingCartFailure(new AppError(400, 'x', code)),
      ).toEqual({ failureCode: code, scope });
    });

    it('carries a stable code rather than the error message', () => {
      const failure = classifyAiOrderingCartFailure(
        new BadRequestError('quantity must be at least 1'),
      );

      // The guest and the model both branch on this. Raw error prose would be
      // untranslatable for one and unparseable for the other.
      expect(failure.failureCode).toBe(ERROR_CODES.BAD_REQUEST);
    });

    it('stops the proposal when the failure is not a cart refusal at all', () => {
      // A defect on our side, not the cart saying no. Carrying on would risk
      // repeating it against every remaining operation.
      expect(classifyAiOrderingCartFailure(new Error('boom'))).toEqual({
        failureCode: ERROR_CODES.INTERNAL_SERVER_ERROR,
        scope: 'session',
      });
    });
  });
});
