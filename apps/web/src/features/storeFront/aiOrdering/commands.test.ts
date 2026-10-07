import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createGuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { storeFrontAiOrderingService } from '@/services/storeFrontAiOrdering.service';

import { createStoreFrontAiOrderingActions } from './actions';
import { createStoreFrontAiOrderingCommands } from './commands';
import { createStoreFrontAiOrderingStore } from './store';
import { createStoreFrontCartStore } from '../cart/store';
import { createTenantStore } from '../tenant/store';

import type { AiOrderingTurn } from '@/models/aiOrdering';
import type { Cart } from '@/models/cart';
import type { StoreFrontCartActions } from '../cart/actions';

vi.mock('@/services/storeFrontAiOrdering.service', () => ({
  storeFrontAiOrderingService: {
    sendMessage: vi.fn(),
    getConversation: vi.fn(),
    decideProposal: vi.fn(),
  },
}));

const sendMessageMock = vi.mocked(storeFrontAiOrderingService.sendMessage);
const getConversationMock = vi.mocked(
  storeFrontAiOrderingService.getConversation,
);
const decideProposalMock = vi.mocked(
  storeFrontAiOrderingService.decideProposal,
);

const STORE_ID = 'store-a';

const CART = { id: 'cart-1', items: [] } as unknown as Cart;

function setup() {
  const store = createStoreFrontAiOrderingStore();
  const cartStore = createStoreFrontCartStore();
  const sessionStore = createGuestSessionStore();
  const tenantStore = createTenantStore();
  const cartActions = {
    cartUpdated: vi.fn(),
  } as unknown as StoreFrontCartActions;

  sessionStore.setState({
    guestToken: 'token-a',
    participantId: 'participant-a',
    storeId: STORE_ID,
  });
  tenantStore.setState({ activeStoreId: STORE_ID });

  return {
    store,
    cartStore,
    sessionStore,
    cartActions,
    commands: createStoreFrontAiOrderingCommands({
      actions: createStoreFrontAiOrderingActions(store),
      store,
      cartActions,
      cartStore,
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

  it('sends only the message, with no client-reported outcome', async () => {
    sendMessageMock.mockResolvedValue(messageTurn);
    const { commands } = setup();

    await commands.sendMessage(STORE_ID, { message: 'What is bubble tea?' });

    expect(sendMessageMock).toHaveBeenCalledWith('token-a', {
      message: 'What is bubble tea?',
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

describe('storefront assistant decision command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function openProposal(operationIds = ['op-1', 'op-2']) {
    sendMessageMock.mockResolvedValue(proposalTurn(operationIds));
    const harness = setup();

    await harness.commands.sendMessage(STORE_ID, { message: 'Add two things' });

    return harness;
  }

  it('sends the kept operation ids, not the operations', async () => {
    const h = await openProposal();

    h.commands.dismissOperation('op-1');
    decideProposalMock.mockResolvedValue({
      proposalId: 'proposal-1',
      results: [
        { operationId: 'op-1', outcome: 'rejected' },
        { operationId: 'op-2', outcome: 'accepted' },
      ],
      cart: CART,
    });

    await h.commands.applyProposal(STORE_ID);

    // Ids only. What executes is rebuilt from the proposal the backend
    // recorded, so a client cannot alter what it proposed.
    expect(decideProposalMock).toHaveBeenCalledWith('token-a', {
      proposalId: 'proposal-1',
      keptOperationIds: ['op-2'],
    });
  });

  it('writes the server results onto the rows', async () => {
    const h = await openProposal(['op-1', 'op-2', 'op-3']);

    decideProposalMock.mockResolvedValue({
      proposalId: 'proposal-1',
      results: [
        { operationId: 'op-1', outcome: 'accepted' },
        {
          operationId: 'op-2',
          outcome: 'failed',
          failureCode: 'PRODUCT_SOLD_OUT',
        },
        { operationId: 'op-3', outcome: 'no_action' },
      ],
      cart: CART,
    });

    await h.commands.applyProposal(STORE_ID);

    const rows = h.store.getState().proposal?.rows ?? [];

    // The side that executed is the side that says what happened; the client
    // does not blend its own assumption into the result.
    expect(rows.map((row) => row.status)).toEqual([
      'applied',
      'failed',
      'not-attempted',
    ]);
    expect(rows[1]?.failureCode).toBe('PRODUCT_SOLD_OUT');
  });

  it('takes the cart from the decision rather than reading it again', async () => {
    const h = await openProposal(['op-1']);

    decideProposalMock.mockResolvedValue({
      proposalId: 'proposal-1',
      results: [{ operationId: 'op-1', outcome: 'accepted' }],
      cart: CART,
    });

    await h.commands.applyProposal(STORE_ID);

    // The response carries the cart the server produced, so the surface
    // unblocks on a confirmed cart rather than on a second round trip.
    expect(h.cartActions.cartUpdated).toHaveBeenCalledWith(CART);
  });

  it('sends one request when the decision is activated twice', async () => {
    const h = await openProposal(['op-1']);

    let release = () => undefined as void;
    decideProposalMock.mockImplementation(
      async () =>
        new Promise((resolve) => {
          release = () => {
            resolve({
              proposalId: 'proposal-1',
              results: [{ operationId: 'op-1', outcome: 'accepted' }],
              cart: CART,
            });
          };
        }),
    );

    const first = h.commands.applyProposal(STORE_ID);
    const second = await h.commands.applyProposal(STORE_ID);

    // The guard, not the disabled button, is what makes this non-repeatable.
    expect(second).toMatchObject({ status: 'failed', reason: 'invalid' });

    release();
    await first;

    expect(decideProposalMock).toHaveBeenCalledTimes(1);
  });

  it('raises the apply flag for the duration of the request', async () => {
    const h = await openProposal(['op-1']);

    let release = () => undefined as void;
    decideProposalMock.mockImplementation(
      async () =>
        new Promise((resolve) => {
          release = () => {
            resolve({
              proposalId: 'proposal-1',
              results: [{ operationId: 'op-1', outcome: 'accepted' }],
              cart: CART,
            });
          };
        }),
    );

    const inFlight = h.commands.applyProposal(STORE_ID);

    expect(h.store.getState().isApplying).toBe(true);
    // Distinct from sending: an apply must not scroll the transcript.
    expect(h.store.getState().isSending).toBe(false);

    release();
    await inFlight;

    expect(h.store.getState().isApplying).toBe(false);
  });

  it('clears the flag when the request fails', async () => {
    const h = await openProposal(['op-1']);

    decideProposalMock.mockRejectedValue(new Error('network down'));

    const result = await h.commands.applyProposal(STORE_ID);

    // An overlay left on screen with nothing in flight is worse than none.
    expect(h.store.getState().isApplying).toBe(false);
    expect(result).toMatchObject({ status: 'failed' });
  });

  it('leaves the rows answerable when nothing executed', async () => {
    const h = await openProposal(['op-1']);

    decideProposalMock.mockRejectedValue(new Error('network down'));

    await h.commands.applyProposal(STORE_ID);

    // The request never reached the backend, so the proposal was not decided
    // and the guest can answer it again.
    expect(h.store.getState().proposal?.rows[0]?.status).toBe('pending');
    expect(h.store.getState().proposal?.isApplied).toBe(false);
  });

  it('refuses when every row is already dismissed', async () => {
    const h = await openProposal(['op-1']);

    h.commands.dismissOperation('op-1');

    await expect(h.commands.applyProposal(STORE_ID)).resolves.toMatchObject({
      status: 'failed',
      reason: 'invalid',
    });
    expect(decideProposalMock).not.toHaveBeenCalled();
  });

  // The per-product limit: at most 99 of one product in the cart, counted
  // across lines. `proposalTurn` adds one of `product-1` per operation.
  function cartHolding(quantity: number): Cart {
    return {
      id: 'cart-1',
      items: [{ id: 'line-1', productId: 'product-1', quantity }],
    } as unknown as Cart;
  }

  it('applies a proposal that lands a product exactly on the limit', async () => {
    const h = await openProposal(['op-1']);
    h.cartStore.setState({ cart: cartHolding(98) });
    decideProposalMock.mockResolvedValue({
      proposalId: 'proposal-1',
      results: [{ operationId: 'op-1', outcome: 'accepted' }],
      cart: CART,
    });

    await expect(h.commands.applyProposal(STORE_ID)).resolves.toMatchObject({
      status: 'applied',
    });
    expect(decideProposalMock).toHaveBeenCalledTimes(1);
  });

  it('does not send a proposal that would take a product past the limit', async () => {
    const h = await openProposal(['op-1']);
    h.cartStore.setState({ cart: cartHolding(99) });

    await expect(h.commands.applyProposal(STORE_ID)).resolves.toMatchObject({
      status: 'failed',
      reason: 'quantity-limit',
    });
    expect(decideProposalMock).not.toHaveBeenCalled();
    // Nothing started, so the proposal is still the guest's to change.
    expect(h.store.getState().isApplying).toBe(false);
    expect(h.store.getState().proposal?.isApplied).toBe(false);
  });

  it('counts only the rows still being applied towards the limit', async () => {
    const h = await openProposal(['op-1', 'op-2']);
    h.cartStore.setState({ cart: cartHolding(99) });
    // op-1 adds the product that is full; op-2 adds a different one.
    h.commands.dismissOperation('op-1');
    decideProposalMock.mockResolvedValue({
      proposalId: 'proposal-1',
      results: [
        { operationId: 'op-1', outcome: 'rejected' },
        { operationId: 'op-2', outcome: 'accepted' },
      ],
      cart: CART,
    });

    await expect(h.commands.applyProposal(STORE_ID)).resolves.toMatchObject({
      status: 'applied',
    });
  });

  it('rejects a token scoped to another store before calling the service', async () => {
    const h = await openProposal(['op-1']);

    await expect(h.commands.applyProposal('store-b')).resolves.toMatchObject({
      reason: 'session-store-mismatch',
    });
    expect(decideProposalMock).not.toHaveBeenCalled();
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
});
