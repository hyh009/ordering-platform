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
  storeFrontAiOrderingService: { sendMessage: vi.fn() },
}));

const sendMessageMock = vi.mocked(storeFrontAiOrderingService.sendMessage);

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
      vi.mocked(cartCommands.addItem).mock.calls.map(
        ([, request]) => request.productId,
      ),
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
    expect(
      vi.mocked(cartCommands.addItem).mock.calls[0]?.[1].productId,
    ).toBe('product-2');
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
});
