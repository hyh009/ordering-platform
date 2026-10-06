import { describe, expect, it } from 'vitest';

import { createStoreFrontAiOrderingActions } from '@/features/storeFront/aiOrdering/actions';
import { createStoreFrontAiOrderingStore } from '@/features/storeFront/aiOrdering/store';

import { buildAssistantPanelView } from './assistantPanelView';

import type {
  AiOrderingProposalState,
  AiOrderingTurn,
} from '@/models/aiOrdering';
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
    expect(entry?.kind === 'choices' && entry.additionalQuestions).toEqual([]);
  });

  it('exposes every question asked in the same turn', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: turn({
        type: 'choices',
        reply: 'Black tea needs two choices.',
        promptId: 'prompt-1',
        question: 'How sweet?',
        inputMode: 'single_choice',
        options: [{ id: 'option-1', label: 'Half sugar' }],
        additionalQuestions: [
          {
            question: 'How much ice?',
            options: [{ id: 'question-2-option-1', label: 'Less ice' }],
          },
        ],
        allowFreeText: true,
      }),
    });

    const entry = view().entries[0];

    // Empty for a single question, so the panel can tell "tap to answer" from
    // "pick one per question, then send".
    expect(entry?.kind === 'choices' && entry.additionalQuestions).toEqual([
      {
        question: 'How much ice?',
        options: [{ id: 'question-2-option-1', label: 'Less ice' }],
      },
    ]);
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

  it('shows the per-row result after a decision and offers no further apply', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1', 'op-2'],
      }),
    });

    actions.proposalDecided([
      { operationId: 'op-1', outcome: 'accepted' },
      {
        operationId: 'op-2',
        outcome: 'failed',
        failureCode: 'PRODUCT_SOLD_OUT',
      },
    ]);

    expect(view().proposal?.isApplied).toBe(true);
    // A decided proposal cannot be answered a second time, so there is nothing
    // left to apply even though one row did not succeed.
    expect(view().proposal?.canApply).toBe(false);
    expect(view().proposal?.rows.map((row) => row.status)).toEqual([
      'applied',
      'failed',
    ]);
    expect(view().proposal?.rows[1]?.failure).toEqual({ kind: 'sold-out' });
  });

  it('offers no apply for a row a failure left unattempted', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1', 'op-2'],
      }),
    });

    actions.proposalDecided([
      {
        operationId: 'op-1',
        outcome: 'failed',
        failureCode: 'ORDER_LOCKED',
      },
      { operationId: 'op-2', outcome: 'no_action' },
    ]);

    // The proposal is spent. Asking again means asking the assistant, which is
    // also how the guest gets an alternative that is valid now.
    expect(view().proposal?.canApply).toBe(false);
    expect(view().proposal?.rows[1]?.status).toBe('not-attempted');
  });
});

describe('assistant proposal row failures', () => {
  function failedRowWith(failureCode: string) {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1'],
      }),
    });
    actions.proposalDecided([
      { operationId: 'op-1', outcome: 'failed', failureCode },
    ]);

    return { actions, row: () => view().proposal?.rows[0] };
  }

  // The point of the whole slice: the reason reaches the guest instead of being
  // captured, reported to the merchant, and then dropped. The codes are the
  // backend's now, because the backend is what attempted the operation.
  it.each([
    ['PRODUCT_SOLD_OUT', 'sold-out'],
    ['PRODUCT_NOT_FOUND', 'off-menu'],
    ['CART_ITEM_NOT_FOUND', 'off-menu'],
    ['MODIFIER_SELECTION_INVALID', 'options-changed'],
    ['NOT_ITEM_OWNER', 'options-changed'],
    ['ORDER_LOCKED', 'cart-closed'],
    ['STORE_NOT_OPEN', 'cart-closed'],
    ['CART_NOT_ACTIVE', 'cart-closed'],
    ['INVALID_GUEST_TOKEN', 'cart-closed'],
    ['TOO_MANY_REQUESTS', 'temporary'],
    ['INTERNAL_SERVER_ERROR', 'temporary'],
  ] as [string, AssistantRowFailureKind][])(
    'presents %s as %s',
    (failureCode, kind) => {
      const { row } = failedRowWith(failureCode);

      expect(row()?.failure?.kind).toBe(kind);
    },
  );

  it('falls back rather than dropping a code it does not recognise', () => {
    // The code set is the API's whole error vocabulary, so an unmapped one is
    // expected. Showing nothing would be worse than showing a generic line.
    expect(failedRowWith('SOME_NEW_CODE').row()?.failure?.kind).toBe('unknown');
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
    actions.proposalDecided([{ operationId: 'op-1', outcome: 'failed' }]);

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

  function restoredTurn(
    id: string,
    proposalId: string,
    proposal?: AiOrderingProposalState,
  ) {
    return {
      id,
      message: 'A tea please',
      versionId: 'v1',
      createdAt: '2026-10-01T00:00:00.000Z',
      response: proposalResponse(proposalId),
      ...(proposal ? { proposal } : {}),
    };
  }

  it('restores a still-pending proposal as the live one', () => {
    const { actions, view } = setup();

    actions.transcriptLoaded([
      restoredTurn('turn-1', 'proposal-1', { status: 'pending' }),
    ]);

    const entry = view().entries.at(-1);

    // Answerable after a reload, which it could not be before: the server now
    // records whether a proposal was decided, so "never answered" and "already
    // applied" are no longer the same thing from here.
    expect(entry?.kind === 'proposal' && entry.record).toBe('live');
    expect(view().proposal?.proposalId).toBe('proposal-1');
    expect(view().proposal?.canApply).toBe(true);
  });

  it('restores a decided proposal with the outcome the server recorded', () => {
    const { actions, view } = setup();

    actions.transcriptLoaded([
      restoredTurn('turn-1', 'proposal-1', {
        status: 'decided',
        decidedAt: '2026-10-01T00:00:10.000Z',
        results: [{ operationId: 'proposal-1-op', outcome: 'accepted' }],
      }),
    ]);

    const entry = view().entries.at(-1);

    // The defect this change exists to fix: a guest whose items are already in
    // the cart must not be told to ask for them again.
    expect(entry?.kind === 'proposal' && entry.record).toBe('history');
    expect(entry?.kind === 'proposal' && entry.results).toEqual([
      { operationId: 'proposal-1-op', outcome: 'accepted' },
    ]);
    expect(view().proposal).toBeNull();
  });

  it('marks an earlier restored proposal as history', () => {
    const { actions, view } = setup();

    actions.transcriptLoaded([
      restoredTurn('turn-1', 'proposal-1', {
        status: 'decided',
        decidedAt: '2026-10-01T00:00:10.000Z',
        results: [],
      }),
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

describe('assistant panel apply in progress', () => {
  it('reports applying and sending independently', () => {
    const { actions, view } = setup();

    expect(view().isApplying).toBe(false);
    expect(view().isSending).toBe(false);

    actions.applyStarted();

    // The panel blocks on an apply and shows a thinking line on a send, so one
    // flag must never stand in for the other.
    expect(view().isApplying).toBe(true);
    expect(view().isSending).toBe(false);

    actions.applyFinished();
    actions.sendStarted();

    expect(view().isApplying).toBe(false);
    expect(view().isSending).toBe(true);
  });
});
