import { describe, expect, it } from 'vitest';

import { createStoreFrontAiOrderingActions } from './actions';
import { createStoreFrontAiOrderingStore } from './store';

import type {
  AiOrderingOperationModel,
  AiOrderingTurn,
} from '@/models/aiOrdering';

function setup() {
  const store = createStoreFrontAiOrderingStore();

  return { store, actions: createStoreFrontAiOrderingActions(store) };
}

const messageTurn: AiOrderingTurn = {
  versionId: 'v1',
  response: { type: 'message', reply: 'Bubble tea is black tea with milk.' },
};

const proposalOperations: AiOrderingOperationModel[] = [
  {
    type: 'add_item',
    operationId: 'op-1',
    summary: 'Add 1 bubble tea',
    item: { productId: 'product-1', quantity: 1 },
  },
  {
    type: 'remove_own_item',
    operationId: 'op-2',
    summary: 'Remove the rice',
    itemId: 'item-1',
  },
];

const proposalTurn: AiOrderingTurn = {
  versionId: 'v1',
  response: {
    type: 'proposal',
    reply: 'Here is what I would add.',
    proposalId: 'proposal-1',
    confirmationRequired: true,
    operations: proposalOperations,
  },
};

describe('storefront assistant actions', () => {
  it('appends a guest message and then the assistant turn in order', () => {
    const { store, actions } = setup();

    actions.guestMessageAppended({ id: 'guest-1', message: 'What is this?' });
    actions.turnAppended({ id: 'assistant-1', turn: messageTurn });

    expect(store.getState().entries).toEqual([
      { id: 'guest-1', role: 'guest', message: 'What is this?' },
      {
        id: 'assistant-1',
        role: 'assistant',
        versionId: 'v1',
        response: messageTurn.response,
      },
    ]);
  });

  it('opens a proposal with every row pending', () => {
    const { store, actions } = setup();

    actions.turnAppended({ id: 'assistant-1', turn: proposalTurn });

    const proposal = store.getState().proposal;

    expect(proposal?.proposalId).toBe('proposal-1');
    expect(proposal?.confirmationRequired).toBe(true);
    expect(proposal?.isApplied).toBe(false);
    expect(proposal?.rows.map((row) => row.status)).toEqual([
      'pending',
      'pending',
    ]);
  });

  it('a non-proposal answer closes whatever proposal was open', () => {
    const { store, actions } = setup();

    actions.turnAppended({ id: 'assistant-1', turn: proposalTurn });
    actions.turnAppended({ id: 'assistant-2', turn: messageTurn });

    // Leaving it open would show a card the assistant has stopped reasoning
    // about.
    expect(store.getState().proposal).toBeNull();
  });

  it('dismisses one row and leaves the rest pending', () => {
    const { store, actions } = setup();

    actions.turnAppended({ id: 'assistant-1', turn: proposalTurn });
    actions.operationDismissed('op-1');

    expect(
      store
        .getState()
        .proposal?.rows.map((row) => [row.operation.operationId, row.status]),
    ).toEqual([
      ['op-1', 'dismissed'],
      ['op-2', 'pending'],
    ]);
  });

  it('records apply results without rewriting a dismissed row', () => {
    const { store, actions } = setup();

    actions.turnAppended({ id: 'assistant-1', turn: proposalTurn });
    actions.operationDismissed('op-1');
    actions.proposalApplied([
      {
        operationId: 'op-2',
        row: { operation: proposalOperations[1]!, status: 'applied' },
      },
    ]);

    const proposal = store.getState().proposal;

    expect(proposal?.isApplied).toBe(true);
    expect(proposal?.rows.map((row) => row.status)).toEqual([
      'dismissed',
      'applied',
    ]);
  });

  it('marks only a failed row as retrying', () => {
    const { store, actions } = setup();

    actions.turnAppended({ id: 'assistant-1', turn: proposalTurn });
    actions.proposalApplied([
      {
        operationId: 'op-1',
        row: {
          operation: proposalOperations[0]!,
          status: 'failed',
          failureCode: 'network',
        },
      },
      {
        operationId: 'op-2',
        row: { operation: proposalOperations[1]!, status: 'applied' },
      },
    ]);

    actions.operationRetryStarted('op-1');
    // An applied row is not a retry target, so asking for one changes nothing.
    actions.operationRetryStarted('op-2');

    const rows = store.getState().proposal?.rows ?? [];

    expect(rows[0]?.isRetrying).toBe(true);
    // The reason stays put while the retry runs: blanking it would empty the
    // line the guest is reading mid-flight.
    expect(rows[0]?.failureCode).toBe('network');
    expect(rows[1]?.isRetrying).toBeUndefined();
  });

  it('an apply flag is independent of the sending flag', () => {
    const { store, actions } = setup();

    actions.applyStarted();

    // The transcript auto-scroll effect watches `isSending`. If applying set it,
    // every apply would scroll the transcript away from what the guest is reading.
    expect(store.getState().isApplying).toBe(true);
    expect(store.getState().isSending).toBe(false);

    actions.applyFinished();

    expect(store.getState().isApplying).toBe(false);
    expect(store.getState().isSending).toBe(false);
  });

  it('expiring a proposal clears it and leaves the transcript alone', () => {
    const { store, actions } = setup();

    actions.turnAppended({ id: 'assistant-1', turn: proposalTurn });
    actions.proposalExpired();

    expect(store.getState().proposal).toBeNull();
    expect(store.getState().entries).toHaveLength(1);
  });

  it('a send failure stops the sending flag and records the message', () => {
    const { store, actions } = setup();

    actions.sendStarted();
    expect(store.getState().isSending).toBe(true);

    actions.sendFailed('Assistant is unavailable.');

    expect(store.getState().isSending).toBe(false);
    expect(store.getState().error).toBe('Assistant is unavailable.');
  });
});
