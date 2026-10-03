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

  it('writes the server decision onto every row', () => {
    const { store, actions } = setup();

    actions.turnAppended({ id: 'assistant-1', turn: proposalTurn });
    actions.proposalDecided([
      { operationId: 'op-1', outcome: 'rejected' },
      {
        operationId: 'op-2',
        outcome: 'failed',
        failureCode: 'PRODUCT_SOLD_OUT',
      },
    ]);

    const proposal = store.getState().proposal;

    expect(proposal?.isApplied).toBe(true);
    expect(proposal?.rows.map((row) => row.status)).toEqual([
      'dismissed',
      'failed',
    ]);
    expect(proposal?.rows[1]?.failureCode).toBe('PRODUCT_SOLD_OUT');
  });

  it('distinguishes an operation that was never attempted from a refusal', () => {
    const { store, actions } = setup();

    actions.turnAppended({ id: 'assistant-1', turn: proposalTurn });
    actions.proposalDecided([
      { operationId: 'op-1', outcome: 'rejected' },
      { operationId: 'op-2', outcome: 'no_action' },
    ]);

    // "The guest said no" and "a failure stopped the proposal before we got
    // here" read differently to the guest looking at the rows.
    expect(store.getState().proposal?.rows.map((row) => row.status)).toEqual([
      'dismissed',
      'not-attempted',
    ]);
  });

  it('distinguishes never answering from refusing and from not reaching it', () => {
    const { store, actions } = setup();

    actions.turnAppended({ id: 'assistant-1', turn: proposalTurn });
    actions.proposalDecided([
      { operationId: 'op-1', outcome: 'superseded' },
      { operationId: 'op-2', outcome: 'no_action' },
    ]);

    // "You never answered this" is not "a failure stopped us reaching it", and
    // showing the guest "not attempted" for a proposal they simply walked past
    // described the system rather than what they did.
    expect(store.getState().proposal?.rows.map((row) => row.status)).toEqual([
      'unanswered',
      'not-attempted',
    ]);
  });

  it('leaves a row alone when the decision carries no result for it', () => {
    const { store, actions } = setup();

    actions.turnAppended({ id: 'assistant-1', turn: proposalTurn });
    actions.proposalDecided([{ operationId: 'op-1', outcome: 'accepted' }]);

    expect(store.getState().proposal?.rows.map((row) => row.status)).toEqual([
      'applied',
      'pending',
    ]);
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

  it('writes a decision onto the transcript entry, not only the live card', () => {
    const { store, actions } = setup();

    actions.turnAppended({ id: 'assistant-1', turn: proposalTurn });
    actions.proposalDecided([
      { operationId: 'op-1', outcome: 'accepted' },
      { operationId: 'op-2', outcome: 'rejected' },
    ]);

    // The card is replaced by the next message. Without this, a guest reading
    // back saw every past proposal with no verdict at all.
    const entry = store.getState().entries[0];

    expect(entry?.role === 'assistant' && entry.proposalResults).toEqual([
      { operationId: 'op-1', outcome: 'accepted' },
      { operationId: 'op-2', outcome: 'rejected' },
    ]);
  });

  it('marks a proposal the next message settled', () => {
    const { store, actions } = setup();

    actions.turnAppended({ id: 'assistant-1', turn: proposalTurn });
    actions.turnAppended({
      id: 'assistant-2',
      turn: {
        ...messageTurn,
        settledProposal: {
          proposalId: 'proposal-1',
          results: [
            { operationId: 'op-1', outcome: 'superseded' },
            { operationId: 'op-2', outcome: 'superseded' },
          ],
        },
      },
    });

    // The guest typed instead of answering. Nothing happened on the client, so
    // the server has to say so — and it says so about an EARLIER entry.
    const entry = store.getState().entries[0];

    expect(entry?.role === 'assistant' && entry.proposalResults).toEqual([
      { operationId: 'op-1', outcome: 'superseded' },
      { operationId: 'op-2', outcome: 'superseded' },
    ]);
  });

  it('settles the proposal the id names, not the most recent one', () => {
    const { store, actions } = setup();

    actions.turnAppended({ id: 'assistant-1', turn: proposalTurn });
    actions.turnAppended({
      id: 'assistant-2',
      turn: {
        ...proposalTurn,
        response: { ...proposalTurn.response, proposalId: 'proposal-2' },
      } as AiOrderingTurn,
    });
    actions.turnAppended({
      id: 'assistant-3',
      turn: {
        ...messageTurn,
        settledProposal: {
          proposalId: 'proposal-1',
          results: [{ operationId: 'op-1', outcome: 'superseded' }],
        },
      },
    });

    const [first, second] = store.getState().entries;

    expect(first?.role === 'assistant' && first.proposalResults).toHaveLength(
      1,
    );
    expect(
      second?.role === 'assistant' && second.proposalResults,
    ).toBeUndefined();
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
