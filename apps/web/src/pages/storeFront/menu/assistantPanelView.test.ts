import { describe, expect, it } from 'vitest';

import { createStoreFrontAiOrderingActions } from '@/features/storeFront/aiOrdering/actions';
import { createStoreFrontAiOrderingStore } from '@/features/storeFront/aiOrdering/store';

import { buildAssistantPanelView } from './assistantPanelView';

import type { AiOrderingTurn } from '@/models/aiOrdering';

function setup() {
  const store = createStoreFrontAiOrderingStore();
  const actions = createStoreFrontAiOrderingActions(store);

  return {
    actions,
    view(isAvailable = true) {
      return buildAssistantPanelView({ state: store.getState(), isAvailable });
    },
  };
}

function turn(response: AiOrderingTurn['response']): AiOrderingTurn {
  return { versionId: 'v1', response };
}

function proposalTurn(options: {
  confirmationRequired: boolean;
  operationIds: string[];
}): AiOrderingTurn {
  return turn({
    type: 'proposal',
    reply: 'Here is what I would change.',
    proposalId: 'proposal-1',
    confirmationRequired: options.confirmationRequired,
    operations: options.operationIds.map((operationId, index) => ({
      type: 'add_item',
      operationId,
      summary: `Add item ${String(index + 1)}`,
      item: { productId: `product-${String(index + 1)}`, quantity: 1 },
    })),
  });
}

describe('assistant panel entry point', () => {
  it('reports itself unavailable when the assistant is not enabled', () => {
    const { view } = setup();

    expect(view(false).isAvailable).toBe(false);
  });

  it('reports itself available when the assistant is enabled', () => {
    const { view } = setup();

    expect(view(true).isAvailable).toBe(true);
  });
});

describe('assistant panel renders each response type', () => {
  it('exposes a message as a reply line', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: turn({ type: 'message', reply: 'Black tea with milk.' }),
    });

    expect(view().entries).toEqual([
      { id: 'a1', kind: 'message', reply: 'Black tea with milk.' },
    ]);
  });

  it('exposes choices with its options and always allows free text', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: turn({
        type: 'choices',
        reply: 'Which size?',
        promptId: 'prompt-1',
        question: 'Which size would you like?',
        inputMode: 'single_choice',
        options: [
          { id: 'option-1', label: 'Medium' },
          { id: 'option-2', label: 'Large', description: 'Plus NT$10' },
        ],
        allowFreeText: true,
      }),
    });

    const entry = view().entries[0];

    expect(entry).toMatchObject({
      kind: 'choices',
      question: 'Which size would you like?',
      inputMode: 'single_choice',
      // A guest who wants something not on the list must never be stuck.
      allowsFreeText: true,
    });
    expect(entry?.kind === 'choices' && entry.options).toHaveLength(2);
  });

  it('exposes a proposal entry beside the card it opened', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({ confirmationRequired: true, operationIds: ['op-1'] }),
    });

    const panel = view();

    expect(panel.entries[0]).toEqual({
      id: 'a1',
      kind: 'proposal',
      reply: 'Here is what I would change.',
      proposalId: 'proposal-1',
    });
    expect(panel.proposal?.proposalId).toBe('proposal-1');
  });

  it('exposes an unanswered reply with its reason', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: turn({
        type: 'unanswered',
        reply: 'The menu does not say.',
        reason: 'missing_product_info',
      }),
    });

    expect(view().entries[0]).toEqual({
      id: 'a1',
      kind: 'unanswered',
      reply: 'The menu does not say.',
      reason: 'missing_product_info',
    });
  });

  it('only the latest choices question is the open prompt', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: turn({
        type: 'choices',
        reply: 'Which size?',
        promptId: 'prompt-1',
        question: 'Which size?',
        inputMode: 'single_choice',
        options: [{ id: 'option-1', label: 'Medium' }],
        allowFreeText: true,
      }),
    });

    expect(view().openPrompt).toEqual({ promptId: 'prompt-1' });

    actions.turnAppended({
      id: 'a2',
      turn: turn({ type: 'message', reply: 'Noted.' }),
    });

    // A question the guest has scrolled past is not what their next message
    // answers.
    expect(view().openPrompt).toBeNull();
  });
});

describe('assistant proposal card', () => {
  it('lists one row per operation, each dismissable', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1', 'op-2'],
      }),
    });

    expect(view().proposal?.rows).toEqual([
      {
        operationId: 'op-1',
        summary: 'Add item 1',
        status: 'pending',
        canDismiss: true,
      },
      {
        operationId: 'op-2',
        summary: 'Add item 2',
        status: 'pending',
        canDismiss: true,
      },
    ]);
  });

  it('reports apply unavailable once every row has been dismissed', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1', 'op-2'],
      }),
    });

    actions.operationDismissed('op-1');
    expect(view().proposal?.canApply).toBe(true);

    actions.operationDismissed('op-2');

    // Nothing left to apply, so the control goes away rather than failing when
    // pressed.
    expect(view().proposal?.canApply).toBe(false);
    expect(view().proposal?.rows.every((row) => !row.canDismiss)).toBe(true);
  });

  it('shows the per-row result after applying and offers no further apply', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1', 'op-2'],
      }),
    });

    const rows = view().proposal?.rows ?? [];

    actions.proposalApplied([
      {
        operationId: 'op-1',
        row: {
          operation: {
            type: 'add_item',
            operationId: 'op-1',
            summary: 'Add item 1',
            item: { productId: 'product-1', quantity: 1 },
          },
          status: 'applied',
        },
      },
      {
        operationId: 'op-2',
        row: {
          operation: {
            type: 'add_item',
            operationId: 'op-2',
            summary: 'Add item 2',
            item: { productId: 'product-2', quantity: 1 },
          },
          status: 'failed',
          failureCode: 'sold-out',
        },
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(view().proposal?.isApplied).toBe(true);
    expect(view().proposal?.canApply).toBe(false);
    expect(view().proposal?.rows.map((row) => row.status)).toEqual([
      'applied',
      'failed',
    ]);
    expect(view().proposal?.rows[1]?.failureCode).toBe('sold-out');
  });
});

describe('assistant confirmation mode', () => {
  it('reports confirmation controls only when the server required them', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({ confirmationRequired: true, operationIds: ['op-1'] }),
    });

    expect(view().proposal?.showsConfirmationControls).toBe(true);

    actions.turnAppended({
      id: 'a2',
      turn: proposalTurn({
        confirmationRequired: false,
        operationIds: ['op-1'],
      }),
    });

    // The effective mode is the store setting AND the version's permission,
    // resolved server-side. The panel reports it and never derives it.
    expect(view().proposal?.showsConfirmationControls).toBe(false);
  });
});
