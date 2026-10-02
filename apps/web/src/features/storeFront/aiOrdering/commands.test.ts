import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createGuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { storeFrontAiOrderingService } from '@/services/storeFrontAiOrdering.service';

import { createStoreFrontAiOrderingActions } from './actions';
import { createStoreFrontAiOrderingCommands } from './commands';
import { createStoreFrontAiOrderingStore } from './store';
import { createTenantStore } from '../tenant/store';

import type { AiOrderingTurn } from '@/models/aiOrdering';
import type { StoreFrontCartCommands } from '../cart/commands';

vi.mock('@/services/storeFrontAiOrdering.service', () => ({
  storeFrontAiOrderingService: {
    sendMessage: vi.fn(),
    getConversation: vi.fn(),
  },
}));

const sendMessageMock = vi.mocked(storeFrontAiOrderingService.sendMessage);
const getConversationMock = vi.mocked(
  storeFrontAiOrderingService.getConversation,
);

const STORE_ID = 'store-a';

function cartCommandsStub(
  overrides: Partial<StoreFrontCartCommands> = {},
): StoreFrontCartCommands {
  const updated = { status: 'updated' } as const;

  return {
    addItem: vi.fn().mockResolvedValue(updated),
    updateItem: vi.fn().mockResolvedValue(updated),
    removeItem: vi.fn().mockResolvedValue(updated),
    ...overrides,
  } as unknown as StoreFrontCartCommands;
}

function setup(cartCommands: StoreFrontCartCommands = cartCommandsStub()) {
  const store = createStoreFrontAiOrderingStore();
  const sessionStore = createGuestSessionStore();
  const tenantStore = createTenantStore();

  sessionStore.setState({
    guestToken: 'token-a',
    participantId: 'participant-a',
    storeId: STORE_ID,
  });
  tenantStore.setState({ activeStoreId: STORE_ID });

  return {
    store,
    sessionStore,
    cartCommands,
    commands: createStoreFrontAiOrderingCommands({
      actions: createStoreFrontAiOrderingActions(store),
      store,
      cartCommands,
      sessionStore,
      tenantStore,
    }),
  };
}

function proposalTurn(
  operationIds: string[],
  confirmationRequired = true,
): AiOrderingTurn {
  return {
    versionId: 'v1',
    response: {
      type: 'proposal',
      reply: 'Here is what I would change.',
      proposalId: 'proposal-1',
      confirmationRequired,
      operations: operationIds.map((operationId, index) => ({
        type: 'add_item',
        operationId,
        summary: `Add item ${String(index + 1)}`,
        item: { productId: `product-${String(index + 1)}`, quantity: 1 },
      })),
    },
  };
}

const messageTurn: AiOrderingTurn = {
  versionId: 'v1',
  response: { type: 'message', reply: 'Noted.' },
};

describe('storefront assistant send command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a token scoped to another store before calling the service', async () => {
    const { commands } = setup();

    await expect(
      commands.sendMessage('store-b', { message: 'Hello' }),
    ).resolves.toEqual({
      status: 'failed',
      message: '',
      reason: 'session-store-mismatch',
    });
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('sends no previous outcome on the first turn', async () => {
    sendMessageMock.mockResolvedValue(messageTurn);
    const { commands } = setup();

    await commands.sendMessage(STORE_ID, { message: 'What is bubble tea?' });

    expect(sendMessageMock).toHaveBeenCalledWith('token-a', {
      message: 'What is bubble tea?',
    });
  });

  it('attaches the previous outcome, distinguishing a dismissal from moving on', async () => {
    sendMessageMock.mockResolvedValue(proposalTurn(['op-1', 'op-2']));
    const { commands } = setup();

    await commands.sendMessage(STORE_ID, { message: 'Add two things' });

    commands.dismissOperation('op-1');

    sendMessageMock.mockResolvedValue(messageTurn);
    await commands.sendMessage(STORE_ID, { message: 'Actually, never mind' });

    // op-1 was dismissed on purpose; op-2 was simply left behind. "You removed
    // the tea" and "you moved on" must not reach the model as the same thing.
    expect(sendMessageMock).toHaveBeenLastCalledWith('token-a', {
      message: 'Actually, never mind',
      previousOutcome: {
        proposalId: 'proposal-1',
        results: [
          { operationId: 'op-1', outcome: 'rejected' },
          { operationId: 'op-2', outcome: 'no_action' },
        ],
      },
    });
  });

  it('reports applied rows as accepted on the next turn', async () => {
    sendMessageMock.mockResolvedValue(proposalTurn(['op-1']));
    const { commands } = setup();

    await commands.sendMessage(STORE_ID, { message: 'Add a tea' });
    await commands.applyProposal(STORE_ID);

    sendMessageMock.mockResolvedValue(messageTurn);
    await commands.sendMessage(STORE_ID, { message: 'Anything else?' });

    expect(sendMessageMock).toHaveBeenLastCalledWith('token-a', {
      message: 'Anything else?',
      previousOutcome: {
        proposalId: 'proposal-1',
        results: [{ operationId: 'op-1', outcome: 'accepted' }],
      },
    });
  });

  it('expires the open proposal when a new message is sent', async () => {
    sendMessageMock.mockResolvedValue(proposalTurn(['op-1']));
    const { commands, store } = setup();

    await commands.sendMessage(STORE_ID, { message: 'Add a tea' });
    expect(store.getState().proposal).not.toBeNull();

    sendMessageMock.mockResolvedValue(messageTurn);
    await commands.sendMessage(STORE_ID, { message: 'Something else' });

    expect(store.getState().proposal).toBeNull();
  });

  it('carries a choices answer back with the prompt it answers', async () => {
    sendMessageMock.mockResolvedValue(messageTurn);
    const { commands } = setup();

    await commands.sendMessage(STORE_ID, {
      message: 'Large',
      responseToPromptId: 'prompt-1',
      selectedOptionId: 'option-2',
    });

    expect(sendMessageMock).toHaveBeenCalledWith('token-a', {
      message: 'Large',
      responseToPromptId: 'prompt-1',
      selectedOptionId: 'option-2',
    });
  });

  it('maps a refused request to a typed failure and records it', async () => {
    sendMessageMock.mockResolvedValue(messageTurn);
    const { commands, store } = setup();

    sendMessageMock.mockRejectedValue(
      Object.assign(new Error('disabled'), {
        name: 'ApiError',
        statusCode: 404,
        code: 'AI_ORDERING_DISABLED',
      }),
    );

    const result = await commands.sendMessage(STORE_ID, { message: 'Hello' });

    expect(result.status).toBe('failed');
    expect(store.getState().isSending).toBe(false);
  });
});

describe('storefront assistant apply command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies every pending row in the proposal order', async () => {
    sendMessageMock.mockResolvedValue(proposalTurn(['op-1', 'op-2', 'op-3']));
    const { commands, cartCommands, store } = setup();

    await commands.sendMessage(STORE_ID, { message: 'Add three things' });
    const result = await commands.applyProposal(STORE_ID);

    expect(result).toEqual({
      status: 'applied',
      results: [
        { operationId: 'op-1', outcome: 'accepted' },
        { operationId: 'op-2', outcome: 'accepted' },
        { operationId: 'op-3', outcome: 'accepted' },
      ],
    });
    expect(cartCommands.addItem).toHaveBeenCalledTimes(3);
    expect(
      vi
        .mocked(cartCommands.addItem)
        .mock.calls.map(([, request]) => request.productId),
    ).toEqual(['product-1', 'product-2', 'product-3']);
    expect(store.getState().proposal?.rows.map((row) => row.status)).toEqual([
      'applied',
      'applied',
      'applied',
    ]);
  });

  it('keeps going when the second of three fails, and reports each row', async () => {
    const addItem = vi
      .fn()
      .mockResolvedValueOnce({ status: 'updated' })
      .mockResolvedValueOnce({
        status: 'failed',
        reason: 'sold-out',
        message: 'Sold out',
      })
      .mockResolvedValueOnce({ status: 'updated' });

    sendMessageMock.mockResolvedValue(proposalTurn(['op-1', 'op-2', 'op-3']));
    const { commands, store } = setup(cartCommandsStub({ addItem }));

    await commands.sendMessage(STORE_ID, { message: 'Add three things' });
    const result = await commands.applyProposal(STORE_ID);

    // An item-specific refusal says nothing about the other rows, so the third
    // still goes through and the guest gets one complete report.
    expect(result).toEqual({
      status: 'applied',
      results: [
        { operationId: 'op-1', outcome: 'accepted' },
        { operationId: 'op-2', outcome: 'failed', failureCode: 'sold-out' },
        { operationId: 'op-3', outcome: 'accepted' },
      ],
    });
    expect(addItem).toHaveBeenCalledTimes(3);
    expect(store.getState().proposal?.rows.map((row) => row.status)).toEqual([
      'applied',
      'failed',
      'applied',
    ]);
  });

  it('stops after a session failure instead of retrying the rest', async () => {
    const addItem = vi
      .fn()
      .mockResolvedValueOnce({ status: 'updated' })
      .mockResolvedValueOnce({
        status: 'failed',
        reason: 'session-expired',
        message: '',
      });

    sendMessageMock.mockResolvedValue(proposalTurn(['op-1', 'op-2', 'op-3']));
    const { commands, store } = setup(cartCommandsStub({ addItem }));

    await commands.sendMessage(STORE_ID, { message: 'Add three things' });
    const result = await commands.applyProposal(STORE_ID);

    expect(result).toEqual({
      status: 'failed',
      reason: 'session-expired',
      message: '',
    });
    expect(addItem).toHaveBeenCalledTimes(2);
    // The third was never attempted, so it stays undecided and will report as
    // `no_action` rather than a failure nobody observed.
    expect(store.getState().proposal?.rows.map((row) => row.status)).toEqual([
      'applied',
      'failed',
      'pending',
    ]);
  });

  it('skips the rows the guest dismissed', async () => {
    sendMessageMock.mockResolvedValue(proposalTurn(['op-1', 'op-2']));
    const { commands, cartCommands } = setup();

    await commands.sendMessage(STORE_ID, { message: 'Add two things' });
    commands.dismissOperation('op-1');
    await commands.applyProposal(STORE_ID);

    expect(cartCommands.addItem).toHaveBeenCalledTimes(1);
    expect(vi.mocked(cartCommands.addItem).mock.calls[0]?.[1].productId).toBe(
      'product-2',
    );
  });

  it('refuses to apply once every row has been dismissed', async () => {
    sendMessageMock.mockResolvedValue(proposalTurn(['op-1']));
    const { commands, cartCommands } = setup();

    await commands.sendMessage(STORE_ID, { message: 'Add a tea' });
    commands.dismissOperation('op-1');

    const result = await commands.applyProposal(STORE_ID);

    expect(result.status).toBe('failed');
    expect(cartCommands.addItem).not.toHaveBeenCalled();
  });

  // The abort set used to be the two session reasons only. A locked cart or a
  // dead connection is just as much a property of the request rather than the
  // item, so continuing only produced N copies of the same error.
  it.each([
    'order-locked',
    'cart-not-active',
    'store-closed',
    'network',
    'server',
    'rate-limited',
  ])(
    'stops the loop on %s rather than repeating it per row',
    async (reason) => {
      const addItem = vi
        .fn()
        .mockResolvedValue({ status: 'failed', reason, message: '' });

      sendMessageMock.mockResolvedValue(proposalTurn(['op-1', 'op-2', 'op-3']));
      const { commands, store } = setup(cartCommandsStub({ addItem }));

      await commands.sendMessage(STORE_ID, { message: 'Add three things' });
      const result = await commands.applyProposal(STORE_ID);

      expect(result).toEqual({ status: 'failed', reason, message: '' });
      expect(addItem).toHaveBeenCalledTimes(1);
      expect(store.getState().proposal?.rows.map((row) => row.status)).toEqual([
        'failed',
        'pending',
        'pending',
      ]);
    },
  );

  it.each(['sold-out', 'not-found', 'invalid', 'unknown'])(
    'keeps going past %s, which is about that row only',
    async (reason) => {
      const addItem = vi
        .fn()
        .mockResolvedValueOnce({ status: 'failed', reason, message: '' })
        .mockResolvedValue({ status: 'updated' });

      sendMessageMock.mockResolvedValue(proposalTurn(['op-1', 'op-2']));
      const { commands, store } = setup(cartCommandsStub({ addItem }));

      await commands.sendMessage(STORE_ID, { message: 'Add two things' });
      const result = await commands.applyProposal(STORE_ID);

      expect(result.status).toBe('applied');
      expect(addItem).toHaveBeenCalledTimes(2);
      expect(store.getState().proposal?.rows.map((row) => row.status)).toEqual([
        'failed',
        'applied',
      ]);
    },
  );
});

describe('storefront assistant apply is blocked while it runs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('raises the apply flag for the duration of the loop', async () => {
    let release: (() => void) | undefined;
    const addItem = vi.fn().mockImplementation(
      async () =>
        new Promise((resolve) => {
          release = () => {
            resolve({ status: 'updated' });
          };
        }),
    );

    sendMessageMock.mockResolvedValue(proposalTurn(['op-1']));
    const { commands, store } = setup(cartCommandsStub({ addItem }));

    await commands.sendMessage(STORE_ID, { message: 'Add a tea' });
    const inFlight = commands.applyProposal(STORE_ID);

    expect(store.getState().isApplying).toBe(true);

    release?.();
    await inFlight;

    // False exactly when the command resolves: every cart call has returned, and
    // each one wrote the cart the server sent back, so what is on screen is the
    // confirmed cart rather than a prediction.
    expect(store.getState().isApplying).toBe(false);
  });

  it('sends each operation once when apply is activated twice', async () => {
    let release: (() => void) | undefined;
    const addItem = vi
      .fn()
      .mockImplementationOnce(
        async () =>
          new Promise((resolve) => {
            release = () => {
              resolve({ status: 'updated' });
            };
          }),
      )
      .mockResolvedValue({ status: 'updated' });

    sendMessageMock.mockResolvedValue(proposalTurn(['op-1', 'op-2']));
    const { commands } = setup(cartCommandsStub({ addItem }));

    await commands.sendMessage(STORE_ID, { message: 'Add two things' });

    const first = commands.applyProposal(STORE_ID);
    const second = await commands.applyProposal(STORE_ID);

    // Without the guard the second apply reads the same pending rows — statuses
    // are written only after the loop — and the guest ends up with doubles.
    expect(second.status).toBe('failed');

    release?.();
    await first;

    expect(addItem).toHaveBeenCalledTimes(2);
    expect(
      addItem.mock.calls.map(([, request]) => request.productId),
    ).toEqual(['product-1', 'product-2']);
  });

  it('clears the flag after a row failure', async () => {
    const addItem = vi
      .fn()
      .mockResolvedValue({ status: 'failed', reason: 'sold-out', message: '' });

    sendMessageMock.mockResolvedValue(proposalTurn(['op-1']));
    const { commands, store } = setup(cartCommandsStub({ addItem }));

    await commands.sendMessage(STORE_ID, { message: 'Add a tea' });
    await commands.applyProposal(STORE_ID);

    expect(store.getState().isApplying).toBe(false);
  });

  it('clears the flag after a session-scoped abort', async () => {
    const addItem = vi.fn().mockResolvedValue({
      status: 'failed',
      reason: 'order-locked',
      message: 'Locked',
    });

    sendMessageMock.mockResolvedValue(proposalTurn(['op-1', 'op-2']));
    const { commands, store } = setup(cartCommandsStub({ addItem }));

    await commands.sendMessage(STORE_ID, { message: 'Add two things' });
    const result = await commands.applyProposal(STORE_ID);

    expect(result.status).toBe('failed');
    expect(store.getState().isApplying).toBe(false);
  });

  it('clears the flag when a cart command throws', async () => {
    const addItem = vi.fn().mockRejectedValue(new Error('boom'));

    sendMessageMock.mockResolvedValue(proposalTurn(['op-1']));
    const { commands, store } = setup(cartCommandsStub({ addItem }));

    await commands.sendMessage(STORE_ID, { message: 'Add a tea' });

    // The throw is not swallowed — the finally is what matters here, because an
    // overlay left up with nothing in flight is worse than no overlay.
    await expect(commands.applyProposal(STORE_ID)).rejects.toThrow('boom');
    expect(store.getState().isApplying).toBe(false);
  });

  it('leaves the flag down when there is nothing to apply', async () => {
    sendMessageMock.mockResolvedValue(proposalTurn(['op-1']));
    const { commands, store } = setup();

    await commands.sendMessage(STORE_ID, { message: 'Add a tea' });
    commands.dismissOperation('op-1');
    await commands.applyProposal(STORE_ID);

    expect(store.getState().isApplying).toBe(false);
  });
});

describe('storefront assistant retry command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * `unknown` on the first row: item-scoped, so the loop still applies the
   * second row, and retryable, so this is the shape the retry control actually
   * appears in.
   */
  async function appliedWithFirstRowFailed(reason = 'unknown') {
    const addItem = vi
      .fn()
      .mockResolvedValueOnce({ status: 'failed', reason, message: '' })
      .mockResolvedValue({ status: 'updated' });

    sendMessageMock.mockResolvedValue(proposalTurn(['op-1', 'op-2']));
    const harness = setup(cartCommandsStub({ addItem }));

    await harness.commands.sendMessage(STORE_ID, { message: 'Add two things' });
    await harness.commands.applyProposal(STORE_ID);
    addItem.mockClear();

    return { ...harness, addItem };
  }

  it('re-runs only the failed row and leaves the others alone', async () => {
    const { commands, store, addItem } = await appliedWithFirstRowFailed();

    const result = await commands.retryOperation(STORE_ID, 'op-1');

    expect(result).toEqual({
      status: 'applied',
      results: [{ operationId: 'op-1', outcome: 'accepted' }],
    });
    expect(addItem).toHaveBeenCalledTimes(1);
    expect(addItem.mock.calls[0]?.[1].productId).toBe('product-1');
    expect(store.getState().proposal?.rows.map((row) => row.status)).toEqual([
      'applied',
      'applied',
    ]);
  });

  it('drops the stale reason once the retry succeeds', async () => {
    const { commands, store } = await appliedWithFirstRowFailed();

    await commands.retryOperation(STORE_ID, 'op-1');

    const row = store.getState().proposal?.rows[0];

    expect(row?.failureCode).toBeUndefined();
    expect(row?.isRetrying).toBeUndefined();
  });

  it('records the new reason when the retry fails again', async () => {
    const { commands, store, addItem } = await appliedWithFirstRowFailed();

    addItem.mockResolvedValueOnce({
      status: 'failed',
      reason: 'sold-out',
      message: '',
    });

    const result = await commands.retryOperation(STORE_ID, 'op-1');

    // Item-scoped, so it is not returned as a failure: the row already says it,
    // and surfacing it again would put the same message on screen twice.
    expect(result).toEqual({
      status: 'applied',
      results: [
        { operationId: 'op-1', outcome: 'failed', failureCode: 'sold-out' },
      ],
    });
    expect(store.getState().proposal?.rows[0]?.failureCode).toBe('sold-out');
    expect(store.getState().proposal?.rows[0]?.isRetrying).toBeUndefined();
  });

  it('returns a session-scoped retry failure for the caller to surface', async () => {
    const { commands, store, addItem } = await appliedWithFirstRowFailed();

    addItem.mockResolvedValueOnce({
      status: 'failed',
      reason: 'order-locked',
      message: 'Locked',
    });

    const result = await commands.retryOperation(STORE_ID, 'op-1');

    expect(result).toEqual({
      status: 'failed',
      reason: 'order-locked',
      message: 'Locked',
    });
    expect(store.getState().proposal?.rows[0]?.failureCode).toBe(
      'order-locked',
    );
  });

  it('refuses to retry a row that did not fail', async () => {
    const { commands, addItem } = await appliedWithFirstRowFailed();

    const result = await commands.retryOperation(STORE_ID, 'op-2');

    expect(result.status).toBe('failed');
    expect(addItem).not.toHaveBeenCalled();
  });

  it('refuses to retry when there is no open proposal', async () => {
    const { commands, cartCommands } = setup();

    const result = await commands.retryOperation(STORE_ID, 'op-1');

    expect(result.status).toBe('failed');
    expect(cartCommands.addItem).not.toHaveBeenCalled();
  });

  it('refuses a second retry while the first is still in flight', async () => {
    const { commands, addItem } = await appliedWithFirstRowFailed();

    let release: (() => void) | undefined;
    addItem.mockImplementationOnce(
      async () =>
        new Promise((resolve) => {
          release = () => {
            resolve({ status: 'updated' });
          };
        }),
    );

    const inFlight = commands.retryOperation(STORE_ID, 'op-1');
    const second = await commands.retryOperation(STORE_ID, 'op-1');

    // Without the in-flight guard this would post the same add twice and the
    // guest would end up with two of the item.
    expect(second.status).toBe('failed');
    expect(addItem).toHaveBeenCalledTimes(1);

    release?.();
    await inFlight;
  });

  it('reports a retried row in the outcome sent with the next message', async () => {
    const { commands, store } = await appliedWithFirstRowFailed();

    await commands.retryOperation(STORE_ID, 'op-1');

    sendMessageMock.mockResolvedValue({
      versionId: 'v1',
      response: { type: 'message', reply: 'Done.' },
    });
    await commands.sendMessage(STORE_ID, { message: 'Anything else?' });

    // The report is read off the rows at send time, so a retry needs no separate
    // reporting path: the assistant is told `accepted`, not the first failure.
    expect(sendMessageMock.mock.calls.at(-1)?.[1].previousOutcome).toEqual({
      proposalId: 'proposal-1',
      results: [
        { operationId: 'op-1', outcome: 'accepted' },
        { operationId: 'op-2', outcome: 'accepted' },
      ],
    });
    expect(store.getState().proposal).toBeNull();
  });
});

describe('storefront assistant transcript load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function transcript() {
    return [
      {
        id: 'turn-1',
        message: '有什麼推薦的？',
        versionId: 'v1',
        createdAt: '2026-10-01T00:00:00.000Z',
        response: { type: 'message' as const, reply: '紅茶很受歡迎。' },
      },
      {
        id: 'turn-2',
        message: '那來一杯',
        versionId: 'v1',
        createdAt: '2026-10-01T00:01:00.000Z',
        response: {
          type: 'proposal' as const,
          reply: '這樣可以嗎？',
          proposalId: 'proposal-9',
          confirmationRequired: true,
          operations: [
            {
              type: 'add_item' as const,
              operationId: 'op-9',
              summary: '加入紅茶',
              item: { productId: 'product-9', quantity: 1 },
            },
          ],
        },
      },
    ];
  }

  it('rebuilds both halves of every stored turn, oldest first', async () => {
    getConversationMock.mockResolvedValue(transcript());
    const { commands, store } = setup();

    const result = await commands.loadConversation(STORE_ID);

    expect(result).toEqual({ status: 'loaded' });
    expect(
      store.getState().entries.map((entry) => [entry.role, entry.id]),
    ).toEqual([
      ['guest', 'turn-1:guest'],
      ['assistant', 'turn-1:assistant'],
      ['guest', 'turn-2:guest'],
      ['assistant', 'turn-2:assistant'],
    ]);
    expect(store.getState().isLoaded).toBe(true);
    expect(store.getState().isLoading).toBe(false);
  });

  it('does not restore the last proposal as actionable', async () => {
    getConversationMock.mockResolvedValue(transcript());
    const { commands, store } = setup();

    await commands.loadConversation(STORE_ID);

    // The server learns a proposal's outcome only from the NEXT message, so a
    // proposal that is the last stored turn may already have been applied before
    // the reload. An Apply button on it would double the items in the cart.
    expect(store.getState().proposal).toBeNull();
  });

  it('reaches the network once however often the panel reopens', async () => {
    getConversationMock.mockResolvedValue(transcript());
    const { commands } = setup();

    await commands.loadConversation(STORE_ID);
    await commands.loadConversation(STORE_ID);
    await commands.loadConversation(STORE_ID);

    expect(getConversationMock).toHaveBeenCalledTimes(1);
  });

  it('does not start a second read while the first is in flight', async () => {
    let release: ((turns: never[]) => void) | undefined;
    getConversationMock.mockImplementation(
      async () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const { commands, store } = setup();

    const first = commands.loadConversation(STORE_ID);

    expect(store.getState().isLoading).toBe(true);
    await expect(commands.loadConversation(STORE_ID)).resolves.toEqual({
      status: 'loaded',
    });
    expect(getConversationMock).toHaveBeenCalledTimes(1);

    release?.([]);
    await first;
  });

  it('leaves the transcript unread after a failure so the next open retries', async () => {
    getConversationMock.mockRejectedValue(new Error('network down'));
    const { commands, store } = setup();

    const result = await commands.loadConversation(STORE_ID);

    expect(result.status).toBe('failed');
    expect(store.getState().isLoading).toBe(false);
    // Not `true`: marking it loaded would show the "ask me about a dish" hint to
    // a guest whose conversation simply failed to arrive.
    expect(store.getState().isLoaded).toBe(false);

    getConversationMock.mockResolvedValue(transcript());
    await commands.loadConversation(STORE_ID);

    expect(store.getState().isLoaded).toBe(true);
    expect(getConversationMock).toHaveBeenCalledTimes(2);
  });

  it('refuses to load for a store the session is not scoped to', async () => {
    const { commands } = setup();

    const result = await commands.loadConversation('store-other');

    expect(result.status).toBe('failed');
    expect(getConversationMock).not.toHaveBeenCalled();
  });

  it('discards a transcript that arrives after the session moved on', async () => {
    let release: ((turns: ReturnType<typeof transcript>) => void) | undefined;
    getConversationMock.mockImplementation(
      async () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const { commands, store, sessionStore } = setup();

    const inFlight = commands.loadConversation(STORE_ID);
    sessionStore.setState({ guestToken: 'token-b' });
    release?.(transcript());

    const result = await inFlight;

    // Writing it would show one cart's conversation inside another's.
    expect(result.status).toBe('failed');
    expect(store.getState().entries).toEqual([]);
  });

  it('starts a fresh unread transcript when the conversation is reset', async () => {
    getConversationMock.mockResolvedValue(transcript());
    const { commands, store } = setup();

    await commands.loadConversation(STORE_ID);
    commands.resetConversation();

    expect(store.getState().isLoaded).toBe(false);
    expect(store.getState().entries).toEqual([]);

    await commands.loadConversation(STORE_ID);

    expect(getConversationMock).toHaveBeenCalledTimes(2);
  });
});
