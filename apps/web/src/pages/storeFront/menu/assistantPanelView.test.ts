import { describe, expect, it } from 'vitest';

import { createStoreFrontAiOrderingActions } from '@/features/storeFront/aiOrdering/actions';
import { createStoreFrontAiOrderingStore } from '@/features/storeFront/aiOrdering/store';

import { buildAssistantPanelView } from './assistantPanelView';

import type { AiOrderingTurn } from '@/models/aiOrdering';
import type { StoreFrontCommandFailureReason } from '@/services/utils/storeFrontApiError';
import type { AssistantRowFailureKind } from './assistantPanelView';

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
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1'],
      }),
    });

    const panel = view();

    expect(panel.entries[0]).toEqual({
      id: 'a1',
      kind: 'proposal',
      reply: 'Here is what I would change.',
      proposalId: 'proposal-1',
      operations: [{ operationId: 'op-1', summary: 'Add item 1' }],
      record: 'live',
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
        isRetrying: false,
        canDismiss: true,
      },
      {
        operationId: 'op-2',
        summary: 'Add item 2',
        status: 'pending',
        isRetrying: false,
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
    expect(view().proposal?.rows[1]?.failure).toEqual({
      kind: 'sold-out',
      canRetry: false,
    });
  });
});

describe('assistant proposal row failures', () => {
  function failedRowWith(failureCode: StoreFrontCommandFailureReason) {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1'],
      }),
    });
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
          status: 'failed',
          failureCode,
        },
      },
    ]);

    return { actions, row: () => view().proposal?.rows[0] };
  }

  // The point of the whole slice: the reason reaches the guest instead of being
  // captured, reported to the merchant, and then dropped.
  it.each([
    ['sold-out', 'sold-out'],
    ['not-found', 'off-menu'],
    ['invalid', 'options-changed'],
    ['order-locked', 'cart-closed'],
    ['store-closed', 'cart-closed'],
    ['cart-not-active', 'cart-closed'],
    ['session-expired', 'cart-closed'],
    ['network', 'temporary'],
    ['server', 'temporary'],
    ['rate-limited', 'temporary'],
    ['unknown', 'unknown'],
  ] as [StoreFrontCommandFailureReason, AssistantRowFailureKind][])(
    'presents %s as %s',
    (failureCode, kind) => {
      const { row } = failedRowWith(failureCode);

      expect(row()?.failure?.kind).toBe(kind);
    },
  );

  it('offers a retry only where retrying could succeed', () => {
    // A sold-out product stays sold out, so a retry button would only promise
    // something it cannot deliver.
    expect(failedRowWith('sold-out').row()?.failure?.canRetry).toBe(false);
    expect(failedRowWith('order-locked').row()?.failure?.canRetry).toBe(false);
    expect(failedRowWith('not-found').row()?.failure?.canRetry).toBe(false);
    expect(failedRowWith('network').row()?.failure?.canRetry).toBe(true);
    expect(failedRowWith('server').row()?.failure?.canRetry).toBe(true);
  });

  it('withdraws the retry control while that row is retrying', () => {
    const { actions, row } = failedRowWith('network');

    actions.operationRetryStarted('op-1');

    expect(row()?.isRetrying).toBe(true);
    // Still a failure line — the guest keeps reading why — but the control is
    // gone so the same operation cannot be posted twice.
    expect(row()?.failure?.kind).toBe('temporary');
    expect(row()?.failure?.canRetry).toBe(false);
  });

  it('clears the failure once a retry succeeds', () => {
    const { actions, row } = failedRowWith('network');

    actions.operationRetryStarted('op-1');
    actions.operationRetried({
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
    });

    expect(row()?.status).toBe('applied');
    expect(row()?.failure).toBeUndefined();
    expect(row()?.isRetrying).toBe(false);
  });

  it('leaves a row with no recorded reason on the generic failure line', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1'],
      }),
    });
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
          status: 'failed',
        },
      },
    ]);

    expect(view().proposal?.rows[0]?.status).toBe('failed');
    expect(view().proposal?.rows[0]?.failure).toBeUndefined();
  });
});

describe('assistant confirmation mode', () => {
  it('reports confirmation controls only when the server required them', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1'],
      }),
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

describe('assistant panel transcript loading', () => {
  it('shows neither the spinner nor the empty hint before the first open', () => {
    const { view } = setup();

    // Nothing has been asked for yet, so claiming "you have said nothing" would
    // be a guess the panel is not entitled to make.
    expect(view().isLoadingTranscript).toBe(false);
    expect(view().showsEmptyHint).toBe(false);
  });

  it('shows the spinner while the transcript is being read', () => {
    const { actions, view } = setup();

    actions.transcriptLoadStarted();

    expect(view().isLoadingTranscript).toBe(true);
    expect(view().showsEmptyHint).toBe(false);
  });

  it('shows the empty hint only once the transcript is known to be empty', () => {
    const { actions, view } = setup();

    actions.transcriptLoadStarted();
    actions.transcriptLoaded([]);

    expect(view().isLoadingTranscript).toBe(false);
    expect(view().showsEmptyHint).toBe(true);
  });

  it('keeps the empty hint away from a restored conversation', () => {
    const { actions, view } = setup();

    actions.transcriptLoaded([
      {
        id: 'turn-1',
        message: 'Anything good?',
        versionId: 'v1',
        createdAt: '2026-10-01T00:00:00.000Z',
        response: { type: 'message', reply: 'The tea is popular.' },
      },
    ]);

    expect(view().showsEmptyHint).toBe(false);
    expect(view().entries.map((entry) => entry.kind)).toEqual([
      'guest',
      'message',
    ]);
  });

  it('reopens the prompt when the restored transcript ends on a question', () => {
    const { actions, view } = setup();

    actions.transcriptLoaded([
      {
        id: 'turn-1',
        message: 'A tea please',
        versionId: 'v1',
        createdAt: '2026-10-01T00:00:00.000Z',
        response: {
          type: 'choices',
          reply: 'Which size?',
          promptId: 'prompt-7',
          question: 'Which size?',
          inputMode: 'single_choice',
          options: [{ id: 'opt-m', label: 'Medium' }],
          allowFreeText: true,
        },
      },
    ]);

    // The question was asked and never answered, so the answer the guest types
    // next still belongs to it.
    expect(view().openPrompt).toEqual({ promptId: 'prompt-7' });
  });

  it('keeps a failed read unloaded so neither hint nor spinner shows', () => {
    const { actions, view } = setup();

    actions.transcriptLoadStarted();
    actions.transcriptLoadFailed('Could not load.');

    expect(view().isLoadingTranscript).toBe(false);
    expect(view().showsEmptyHint).toBe(false);
    expect(view().error).toBe('Could not load.');
  });
});

describe('assistant proposal records in the transcript', () => {
  function proposalResponse(proposalId: string) {
    return {
      type: 'proposal' as const,
      reply: 'How about this?',
      proposalId,
      confirmationRequired: true,
      operations: [
        {
          type: 'add_item' as const,
          operationId: `${proposalId}-op`,
          summary: 'Add a tea',
          item: { productId: 'product-1', quantity: 1 },
        },
      ],
    };
  }

  function restoredTurn(id: string, proposalId: string) {
    return {
      id,
      message: 'A tea please',
      versionId: 'v1',
      createdAt: '2026-10-01T00:00:00.000Z',
      response: proposalResponse(proposalId),
    };
  }

  it('marks the latest restored proposal stale rather than live', () => {
    const { actions, view } = setup();

    actions.transcriptLoaded([restoredTurn('turn-1', 'proposal-1')]);

    const entry = view().entries.at(-1);

    // Stale, not live: the card must not offer Apply on a proposal whose outcome
    // the server never recorded.
    expect(entry?.kind === 'proposal' && entry.record).toBe('stale');
    expect(view().proposal).toBeNull();
  });

  it('marks an earlier restored proposal as history', () => {
    const { actions, view } = setup();

    actions.transcriptLoaded([
      restoredTurn('turn-1', 'proposal-1'),
      {
        id: 'turn-2',
        message: 'Thanks',
        versionId: 'v1',
        createdAt: '2026-10-01T00:01:00.000Z',
        response: { type: 'message', reply: 'Anything else?' },
      },
    ]);

    const entry = view().entries[1];

    expect(entry?.kind === 'proposal' && entry.record).toBe('history');
  });

  it('carries the operation summaries so a record can be read back', () => {
    const { actions, view } = setup();

    actions.transcriptLoaded([restoredTurn('turn-1', 'proposal-1')]);

    const entry = view().entries.at(-1);

    expect(entry?.kind === 'proposal' && entry.operations).toEqual([
      { operationId: 'proposal-1-op', summary: 'Add a tea' },
    ]);
  });

  it('demotes a live proposal to history once the next turn arrives', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: { versionId: 'v1', response: proposalResponse('proposal-1') },
    });

    const live = view().entries[0];
    expect(live?.kind === 'proposal' && live.record).toBe('live');

    actions.turnAppended({
      id: 'a2',
      turn: { versionId: 'v1', response: { type: 'message', reply: 'Done.' } },
    });

    // The next turn replaced the open proposal, and its outcome went out with the
    // message that produced it. Nothing about it is actionable any more.
    const demoted = view().entries[0];
    expect(demoted?.kind === 'proposal' && demoted.record).toBe('history');
  });
});
