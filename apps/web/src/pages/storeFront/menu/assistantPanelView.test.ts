import { describe, expect, it } from 'vitest';

import { createStoreFrontAiOrderingActions } from '@/features/storeFront/aiOrdering/actions';
import { createStoreFrontAiOrderingStore } from '@/features/storeFront/aiOrdering/store';

import {
  buildAssistantPanelView,
  canConfirmChoice,
  toggleChoiceOption,
} from './assistantPanelView';

import type {
  AiOrderingChoiceGroupModel,
  AiOrderingProposalState,
  AiOrderingTurn,
} from '@/models/aiOrdering';
import type { PublicMenu, PublicProduct } from '@/models/storeFrontMenu';
import type { AssistantRowFailureKind } from './assistantPanelView';

function product(id: string): PublicProduct {
  return {
    id,
    categoryIds: ['cat-drink'],
    name: { 'zh-TW': id, en: id },
    imageUrls: [],
    price: 35,
    tagIds: [],
    allergenIds: [],
    dietaryMarkerIds: [],
    modifierIds: [],
    isSoldOut: false,
  };
}

const MENU = {
  groups: [
    {
      category: {
        id: 'cat-drink',
        name: { 'zh-TW': '\u98f2\u6599', en: 'Drinks' },
        displayOrder: 1,
        availabilityRules: [],
      },
      products: [product('prod-tea'), product('prod-milk-tea')],
    },
  ],
  modifiers: [],
  tags: [],
  allergens: [],
  dietaryMarkers: [],
} as unknown as PublicMenu;

function setup() {
  const store = createStoreFrontAiOrderingStore();
  const actions = createStoreFrontAiOrderingActions(store);

  return {
    actions,
    view(isAvailable = true) {
      return buildAssistantPanelView({
        state: store.getState(),
        isAvailable,
        menu: MENU,
      });
    },
    viewWithoutMenu() {
      return buildAssistantPanelView({
        state: store.getState(),
        isAvailable: true,
      });
    },
  };
}

function turn(response: AiOrderingTurn['response']): AiOrderingTurn {
  return { versionId: 'v1', response };
}

function proposalTurn(options: {
  confirmationRequired: boolean;
  operationIds: string[];
  /** Choices per operation id, for the ones that have any. */
  choices?: Record<string, AiOrderingChoiceGroupModel[]>;
}): AiOrderingTurn {
  return turn({
    type: 'proposal',
    reply: 'Here is what I would change.',
    proposalId: 'proposal-1',
    confirmationRequired: options.confirmationRequired,
    operations: options.operationIds.map((operationId, index) => {
      const choices = options.choices?.[operationId];

      return {
        type: 'add_item',
        operationId,
        summary: `Add item ${String(index + 1)}`,
        item: { productId: `product-${String(index + 1)}`, quantity: 1 },
        ...(choices
          ? {
              choices,
              summaryWithoutChoices: `Add item ${String(index + 1)}`,
            }
          : {}),
      };
    }),
  });
}

function choice(
  modifierId: string,
  options: {
    isRequired?: boolean;
    optionIds?: string[];
    /** What the assistant already selected. Nothing, unless given. */
    selectedOptionIds?: string[];
    maxSelect?: number;
  } = {},
): AiOrderingChoiceGroupModel {
  return {
    modifierId,
    label: `Choice ${modifierId}`,
    isRequired: options.isRequired ?? true,
    minSelect: options.isRequired === false ? 0 : 1,
    maxSelect: options.maxSelect ?? 1,
    options: (options.optionIds ?? ['opt-a', 'opt-b']).map((optionId) => ({
      optionId,
      label: `Option ${optionId}`,
      priceAdjustment: 0,
    })),
    selectedOptionIds: options.selectedOptionIds ?? [],
  };
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
        canDismiss: true,
        // These items offer no choices, so there is nothing to show or change.
        choices: [],
        canEditChoices: true,
      },
      {
        operationId: 'op-2',
        summary: 'Add item 2',
        status: 'pending',
        canDismiss: true,
        // These items offer no choices, so there is nothing to show or change.
        choices: [],
        canEditChoices: true,
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
    // Not `off-menu`: the product can be on the menu and the item in the cart
    // under another id, which is what a merge leaves behind.
    ['CART_ITEM_NOT_FOUND', 'item-gone'],
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

  it('does not tell a guest a merged-away item left the menu', () => {
    // The row the assistant proposed changing was folded into an identical
    // line when the guest edited that line's options, so its id is gone while
    // the product is on the menu and the item is in the cart. This shared the
    // `off-menu` wording and stated three things that were all untrue.
    const { row } = failedRowWith('CART_ITEM_NOT_FOUND');

    expect(row()?.failure?.kind).toBe('item-gone');
    expect(row()?.failure?.kind).not.toBe('off-menu');
  });

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

  it('restores what the assistant said about a decision', () => {
    const { actions, view } = setup();

    actions.transcriptLoaded([
      restoredTurn('turn-1', 'proposal-1', {
        status: 'decided',
        decidedAt: '2026-10-01T00:00:10.000Z',
        results: [{ operationId: 'proposal-1-op', outcome: 'accepted' }],
        reply: '紅茶加好了。',
      }),
    ]);

    const entry = view().entries.at(-1);

    // A reload used to keep the row statuses and lose the sentence: a
    // transcript that remembers the outcome and forgets the explanation.
    expect(entry?.kind === 'proposal' && entry.decidedReply).toBe('紅茶加好了。');
    // And it stays separate from what the assistant said when it PROPOSED,
    // which is still the entry's own reply.
    expect(entry?.kind === 'proposal' && entry.reply).not.toBe('紅茶加好了。');
  });

  it('restores a decision that carried no sentence without inventing one', () => {
    const { actions, view } = setup();

    actions.transcriptLoaded([
      restoredTurn('turn-1', 'proposal-1', {
        status: 'decided',
        decidedAt: '2026-10-01T00:00:10.000Z',
        results: [{ operationId: 'proposal-1-op', outcome: 'rejected' }],
      }),
    ]);

    const entry = view().entries.at(-1);

    expect(entry?.kind === 'proposal' && entry.decidedReply).toBeUndefined();
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

  describe('once decided, a line names its options', () => {
    const teaResponse = {
      type: 'proposal' as const,
      reply: 'How about this?',
      proposalId: 'proposal-1',
      confirmationRequired: true,
      operations: [
        {
          type: 'add_item' as const,
          operationId: 'op-tea',
          summary: '+ Tea ×1 · No sugar',
          summaryWithoutChoices: '+ Tea ×1',
          item: { productId: 'product-1', quantity: 1 },
          choices: [choice('mod-sugar', { selectedOptionIds: ['opt-a'] })],
        },
        {
          type: 'add_item' as const,
          operationId: 'op-rice',
          summary: '+ Rice ×1',
          item: { productId: 'product-2', quantity: 1 },
        },
      ],
    };

    const restored = (proposal?: AiOrderingProposalState) => ({
      id: 'turn-1',
      message: 'A tea and a rice please',
      versionId: 'v1',
      createdAt: '2026-10-01T00:00:00.000Z',
      response: teaResponse,
      ...(proposal ? { proposal } : {}),
    });

    const results = [
      { operationId: 'op-tea', outcome: 'accepted' as const },
      { operationId: 'op-rice', outcome: 'accepted' as const },
    ];

    const summariesOf = (view: ReturnType<typeof setup>['view']) => {
      const entry = view().entries.at(-1);

      return entry?.kind === 'proposal'
        ? entry.operations.map((operation) => operation.summary)
        : [];
    };

    it('shows the options of a line the guest left as proposed', () => {
      const { actions, view } = setup();

      actions.transcriptLoaded([
        restored({
          status: 'decided',
          decidedAt: '2026-10-01T00:00:10.000Z',
          results,
        }),
      ]);

      // This used to read "+ Tea ×1" for good. Leaving the options out is right
      // while they can still change; once decided it only hid what was ordered.
      expect(summariesOf(view)).toEqual(['+ Tea ×1 · No sugar', '+ Rice ×1']);
    });

    it("shows the guest's options on a line they changed", () => {
      const { actions, view } = setup();

      actions.transcriptLoaded([
        restored({
          status: 'decided',
          decidedAt: '2026-10-01T00:00:10.000Z',
          results,
          appliedSummaries: [
            { operationId: 'op-tea', summary: '+ Tea ×1 · Half sugar' },
          ],
        }),
      ]);

      // What reached the cart, not what the assistant first suggested.
      expect(summariesOf(view)).toEqual(['+ Tea ×1 · Half sugar', '+ Rice ×1']);
    });

    it('shows them straight after the guest applies, without a reload', () => {
      const { actions, view } = setup();

      actions.turnAppended({ id: 'a1', turn: turn(teaResponse) });
      actions.proposalDecided(results, [
        { operationId: 'op-tea', summary: '+ Tea ×1 · Half sugar' },
      ]);

      expect(summariesOf(view)).toEqual(['+ Tea ×1 · Half sugar', '+ Rice ×1']);
    });

    it('still leaves them off a line that is waiting to be decided', () => {
      const { actions, view } = setup();

      actions.transcriptLoaded([restored({ status: 'pending' })]);

      // The card lists the choices and the guest may change them, so the line
      // must not name picks that could turn out not to be the final ones.
      expect(summariesOf(view)).toEqual(['+ Tea ×1', '+ Rice ×1']);
    });
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

describe('assistant panel dock', () => {
  function choicesTurn(promptId: string): AiOrderingTurn {
    return turn({
      type: 'choices',
      reply: 'Black tea needs a sugar level.',
      promptId,
      question: 'How sweet?',
      inputMode: 'single_choice',
      options: [{ id: 'option-1', label: 'Half sugar' }],
      allowFreeText: true,
    });
  }

  it('holds nothing when the last reply asks for nothing', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: turn({ type: 'message', reply: 'We open at eleven.' }),
    });

    expect(view().dock).toBeNull();
  });

  it('holds the question the last reply asked', () => {
    const { actions, view } = setup();

    actions.turnAppended({ id: 'a1', turn: choicesTurn('prompt-1') });

    expect(view().dock).toEqual({
      kind: 'question',
      promptId: 'prompt-1',
      question: 'How sweet?',
      options: [{ id: 'option-1', label: 'Half sugar' }],
      allowsFreeText: true,
    });
  });

  it('lets go of the question once the guest has answered', () => {
    const { actions, view } = setup();

    actions.turnAppended({ id: 'a1', turn: choicesTurn('prompt-1') });
    actions.guestMessageAppended({ id: 'g1', message: 'Half sugar' });

    expect(view().dock).toBeNull();
  });

  it('holds a proposal the guest still has to decide', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1', 'op-2'],
      }),
    });

    const dock = view().dock;

    expect(dock?.kind).toBe('proposal');
    expect(dock?.kind === 'proposal' && dock.proposal.rows).toHaveLength(2);
  });

  it('keeps holding the proposal while any row is still undecided', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1', 'op-2'],
      }),
    });
    actions.operationDismissed('op-1');

    expect(view().dock?.kind).toBe('proposal');

    // Nothing left to accept, so nothing is waiting on the guest.
    actions.operationDismissed('op-2');

    expect(view().dock).toBeNull();
  });

  it('leaves a proposal that applies without asking in the transcript', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: false,
        operationIds: ['op-1'],
      }),
    });

    expect(view().dock).toBeNull();
  });
});

describe('choices a proposal left open', () => {
  it('asks for one choice at a time, grouped by the item it belongs to', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1', 'op-2'],
        choices: {
          'op-1': [choice('mod-sugar'), choice('mod-ice')],
          'op-2': [choice('mod-spice')],
        },
      }),
    });

    // One, not three. A wall of pickers across every row is the pile of
    // decisions this exists to avoid.
    expect(view().proposal?.openChoice).toMatchObject({
      operationId: 'op-1',
      modifierId: 'mod-sugar',
      itemSummary: 'Add item 1',
      remainingCount: 3,
    });
  });

  it('names every choice still waiting, not only the one being asked', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1', 'op-2'],
        choices: {
          'op-1': [choice('mod-sugar'), choice('mod-ice')],
          'op-2': [choice('mod-spice')],
        },
      }),
    });

    // The picker asks one at a time, which leaves the guest unable to see how
    // much is left — and with a single choice open it shows no count at all.
    expect(view().proposal?.openChoiceLabels).toEqual([
      'Choice mod-sugar',
      'Choice mod-ice',
      'Choice mod-spice',
    ]);
  });

  it('drops a choice from the waiting list once it is answered', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1'],
        choices: {
          'op-1': [choice('mod-sugar'), choice('mod-ice')],
        },
      }),
    });

    actions.proposalChoiceAnswered({
      operationId: 'op-1',
      modifierId: 'mod-sugar',
      optionIds: ['opt-a'],
    });

    expect(view().proposal?.openChoiceLabels).toEqual(['Choice mod-ice']);
  });

  it('names nothing to pick once the proposal is applied', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1'],
        choices: { 'op-1': [choice('mod-sugar')] },
      }),
    });
    actions.proposalDecided([{ operationId: 'op-1', outcome: 'accepted' }]);

    expect(view().proposal?.openChoiceLabels).toEqual([]);
  });

  it('moves to the next choice once one is answered', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1'],
        choices: {
          'op-1': [choice('mod-sugar'), choice('mod-ice')],
        },
      }),
    });

    actions.proposalChoiceAnswered({
      operationId: 'op-1',
      modifierId: 'mod-sugar',
      optionIds: ['opt-a'],
    });

    expect(view().proposal?.openChoice).toMatchObject({
      modifierId: 'mod-ice',
      remainingCount: 1,
    });
  });

  it('withholds apply until every required choice is answered', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1'],
        choices: { 'op-1': [choice('mod-sugar')] },
      }),
    });

    expect(view().proposal?.canApply).toBe(false);

    actions.proposalChoiceAnswered({
      operationId: 'op-1',
      modifierId: 'mod-sugar',
      optionIds: ['opt-a'],
    });

    expect(view().proposal?.canApply).toBe(true);
    expect(view().proposal?.openChoice).toBeNull();
  });

  it('counts a declined optional choice as answered', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1'],
        choices: {
          'op-1': [choice('mod-topping', { isRequired: false })],
        },
      }),
    });

    // Optional, so it never blocked apply — but it still has to leave the queue
    // or the guest would be asked about it forever.
    expect(view().proposal?.canApply).toBe(true);

    actions.proposalChoiceAnswered({
      operationId: 'op-1',
      modifierId: 'mod-topping',
      optionIds: [],
    });

    expect(view().proposal?.openChoice).toBeNull();
  });

  it('stops asking for the choices of a row the guest dismissed', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1', 'op-2'],
        choices: {
          'op-1': [choice('mod-sugar')],
          'op-2': [choice('mod-spice')],
        },
      }),
    });

    actions.operationDismissed('op-1');

    // Nothing is going anywhere for op-1, so asking for its sugar level would
    // be asking for nothing.
    expect(view().proposal?.openChoice).toMatchObject({
      operationId: 'op-2',
      modifierId: 'mod-spice',
      remainingCount: 1,
    });
  });

  it('shows the confirm controls even when the store applies automatically', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: false,
        operationIds: ['op-1'],
        choices: { 'op-1': [choice('mod-sugar')] },
      }),
    });

    // Otherwise the panel would auto-apply a proposal the server will refuse,
    // and the guest would see an error for a choice nobody asked them to make.
    expect(view().proposal?.showsConfirmationControls).toBe(true);
    expect(view().proposal?.canApply).toBe(false);
  });
});

describe('choices a proposal already has an answer for', () => {
  const answeredProposal = () =>
    proposalTurn({
      confirmationRequired: true,
      operationIds: ['op-1'],
      choices: {
        'op-1': [
          // The assistant picked a sugar level; the guest never stated the ice.
          choice('mod-sugar', { selectedOptionIds: ['opt-a'] }),
          choice('mod-ice'),
          choice('mod-topping', { isRequired: false }),
        ],
      },
    });

  it('shows an answered choice on its row, changeable, and does not ask for it', () => {
    const { actions, view } = setup();

    actions.turnAppended({ id: 'a1', turn: answeredProposal() });

    const proposal = view().proposal;

    expect(proposal?.rows[0]?.canEditChoices).toBe(true);
    expect(proposal?.rows[0]?.choices).toMatchObject([
      {
        operationId: 'op-1',
        modifierId: 'mod-sugar',
        selectedOptionIds: ['opt-a'],
        selectedLabels: ['Option opt-a'],
        // Everything the picker needs to change it comes with it.
        options: [{ id: 'opt-a' }, { id: 'opt-b' }],
      },
    ]);
    // The queue starts at the first choice with NO answer. Asking for the sugar
    // again would be asking the guest to confirm a guess one tap at a time.
    expect(proposal?.openChoice).toMatchObject({
      modifierId: 'mod-ice',
      remainingCount: 2,
    });
  });

  it('changing an answered choice replaces it and does not re-queue the others', () => {
    const { actions, view } = setup();

    actions.turnAppended({ id: 'a1', turn: answeredProposal() });
    actions.proposalChoiceAnswered({
      operationId: 'op-1',
      modifierId: 'mod-ice',
      optionIds: ['opt-b'],
    });
    actions.proposalChoiceAnswered({
      operationId: 'op-1',
      modifierId: 'mod-topping',
      optionIds: [],
    });

    expect(view().proposal?.openChoice).toBeNull();

    // Now the guest corrects the sugar the assistant picked.
    actions.proposalChoiceAnswered({
      operationId: 'op-1',
      modifierId: 'mod-sugar',
      optionIds: ['opt-b'],
    });

    const proposal = view().proposal;

    expect(proposal?.openChoice).toBeNull();
    expect(proposal?.canApply).toBe(true);
    expect(
      proposal?.rows[0]?.choices.map((entry) => [
        entry.modifierId,
        entry.selectedOptionIds,
      ]),
    ).toEqual([
      ['mod-sugar', ['opt-b']],
      ['mod-ice', ['opt-b']],
      ['mod-topping', []],
    ]);
  });

  it('changing an answered choice leaves the queue where it was', () => {
    const { actions, view } = setup();

    actions.turnAppended({ id: 'a1', turn: answeredProposal() });
    actions.proposalChoiceAnswered({
      operationId: 'op-1',
      modifierId: 'mod-sugar',
      optionIds: ['opt-b'],
    });

    // Still the ice, still two left: the edit answered nothing in the queue and
    // put nothing back into it.
    expect(view().proposal?.openChoice).toMatchObject({
      modifierId: 'mod-ice',
      remainingCount: 2,
    });
  });

  it('still withholds apply while a required choice has no answer', () => {
    const { actions, view } = setup();

    actions.turnAppended({ id: 'a1', turn: answeredProposal() });

    // One required choice came answered; the other did not, and that one blocks.
    expect(view().proposal?.canApply).toBe(false);

    actions.proposalChoiceAnswered({
      operationId: 'op-1',
      modifierId: 'mod-ice',
      optionIds: ['opt-a'],
    });

    // The optional topping is still in the queue, and does not block.
    expect(view().proposal?.canApply).toBe(true);
    expect(view().proposal?.openChoice?.modifierId).toBe('mod-topping');
  });

  it('can be applied straight away when the assistant answered every required choice', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1'],
        choices: {
          'op-1': [choice('mod-sugar', { selectedOptionIds: ['opt-a'] })],
        },
      }),
    });

    expect(view().proposal?.canApply).toBe(true);
    expect(view().proposal?.openChoice).toBeNull();
  });

  it('keeps a declined optional choice on the row so it can be taken back', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1'],
        choices: {
          'op-1': [
            // The assistant added a topping nobody asked for.
            choice('mod-topping', {
              isRequired: false,
              selectedOptionIds: ['opt-a'],
            }),
          ],
        },
      }),
    });
    actions.proposalChoiceAnswered({
      operationId: 'op-1',
      modifierId: 'mod-topping',
      optionIds: [],
    });

    expect(view().proposal?.rows[0]?.choices).toMatchObject([
      { modifierId: 'mod-topping', selectedOptionIds: [], selectedLabels: [] },
    ]);
    expect(view().proposal?.openChoice).toBeNull();
  });

  it('stops offering changes once the row is dismissed or the proposal applied', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1', 'op-2'],
        choices: {
          'op-1': [choice('mod-sugar', { selectedOptionIds: ['opt-a'] })],
          'op-2': [choice('mod-spice', { selectedOptionIds: ['opt-a'] })],
        },
      }),
    });
    actions.operationDismissed('op-1');

    const rows = view().proposal?.rows;

    // Still shown as text — it is what the row was — but no longer changeable.
    expect(rows?.[0]?.choices).toHaveLength(1);
    expect(rows?.[0]?.canEditChoices).toBe(false);
    expect(rows?.[1]?.canEditChoices).toBe(true);
  });

  it('uses the line without the choices, so an edit cannot contradict it', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: turn({
        type: 'proposal',
        reply: 'Here is what I would change.',
        proposalId: 'proposal-1',
        confirmationRequired: true,
        operations: [
          {
            type: 'add_item',
            operationId: 'op-1',
            summary: '+ Tea ×1 · No sugar',
            summaryWithoutChoices: '+ Tea ×1',
            item: { productId: 'product-1', quantity: 1 },
            choices: [choice('mod-sugar', { selectedOptionIds: ['opt-a'] })],
          },
        ],
      }),
    });

    expect(view().proposal?.rows[0]?.summary).toBe('+ Tea ×1');
    expect(view().proposal?.rows[0]?.choices[0]?.itemSummary).toBe('+ Tea ×1');

    const entry = view().entries.at(-1);

    expect(entry?.kind === 'proposal' && entry.operations[0]?.summary).toBe(
      '+ Tea ×1',
    );
  });

  it('keeps a proposal with a required choice open in the dock', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: proposalTurn({
        confirmationRequired: true,
        operationIds: ['op-1'],
        choices: { 'op-1': [choice('mod-sugar')] },
      }),
    });

    // It cannot be applied yet, but it is waiting on the guest all the same.
    // Leaving the dock here would put the picker in the transcript and move the
    // card the moment the last choice was answered.
    expect(view().proposal?.canApply).toBe(false);
    expect(view().dock?.kind).toBe('proposal');
  });
});

describe('choices that take more than one answer', () => {
  const toppings = () =>
    proposalTurn({
      confirmationRequired: true,
      operationIds: ['op-1'],
      choices: {
        'op-1': [
          choice('mod-topping', {
            isRequired: false,
            maxSelect: 2,
            optionIds: ['opt-a', 'opt-b', 'opt-c'],
          }),
        ],
      },
    });

  it('marks the choice as one that toggles', () => {
    const { actions, view } = setup();

    actions.turnAppended({ id: 'a1', turn: toppings() });

    expect(view().proposal?.openChoice).toMatchObject({
      isMultiSelect: true,
      maxSelect: 2,
    });
  });

  it('shows every option the guest confirmed', () => {
    const { actions, view } = setup();

    actions.turnAppended({ id: 'a1', turn: toppings() });
    actions.proposalChoiceAnswered({
      operationId: 'op-1',
      modifierId: 'mod-topping',
      optionIds: ['opt-a', 'opt-c'],
    });

    expect(view().proposal?.rows[0]?.choices[0]?.selectedLabels).toEqual([
      'Option opt-a',
      'Option opt-c',
    ]);
    expect(view().proposal?.openChoice).toBeNull();
  });

  it('toggles an option on and off, and stops at the maximum', () => {
    const limit = { maxSelect: 2 };

    expect(toggleChoiceOption(limit, [], 'opt-a')).toEqual(['opt-a']);
    expect(toggleChoiceOption(limit, ['opt-a'], 'opt-a')).toEqual([]);
    // A third is ignored rather than swapped in: which one to drop is not
    // something to guess.
    expect(toggleChoiceOption(limit, ['opt-a', 'opt-b'], 'opt-c')).toEqual([
      'opt-a',
      'opt-b',
    ]);
  });

  it('confirms only within the minimum and the maximum', () => {
    expect(canConfirmChoice({ minSelect: 0, maxSelect: 2 }, [])).toBe(true);
    expect(canConfirmChoice({ minSelect: 1, maxSelect: 2 }, [])).toBe(false);
    expect(canConfirmChoice({ minSelect: 1, maxSelect: 2 }, ['opt-a'])).toBe(
      true,
    );
    expect(
      canConfirmChoice({ minSelect: 0, maxSelect: 2 }, [
        'opt-a',
        'opt-b',
        'opt-c',
      ]),
    ).toBe(false);
  });
});

describe('assistant panel shown products', () => {
  it('resolves shown ids into the menu\u2019s own products', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: turn({
        type: 'products',
        reply: '\u9019\u4e9b\u662f\u6211\u5011\u7684\u98f2\u6599\u3002',
        productIds: ['prod-milk-tea', 'prod-tea'],
        categoryId: 'cat-drink',
      }),
    });

    const entry = view().entries[0];

    // In the order the response gave, not menu order: that order is the only
    // ranking the assistant can express.
    expect(
      entry?.kind === 'products' && entry.products.map((item) => item.id),
    ).toEqual(['prod-milk-tea', 'prod-tea']);
  });

  it('drops an id the menu no longer holds', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: turn({
        type: 'products',
        reply: '\u9019\u4e9b\u662f\u6211\u5011\u7684\u98f2\u6599\u3002',
        productIds: ['prod-tea', 'prod-withdrawn'],
      }),
    });

    const entry = view().entries[0];

    // A stored turn outlives the menu that produced it. One card missing is
    // better than a card with nothing on it.
    expect(
      entry?.kind === 'products' && entry.products.map((item) => item.id),
    ).toEqual(['prod-tea']);
  });

  it('shows no cards at all until the menu is loaded', () => {
    const { actions, viewWithoutMenu } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: turn({
        type: 'products',
        reply: '\u9019\u4e9b\u662f\u6211\u5011\u7684\u98f2\u6599\u3002',
        productIds: ['prod-tea'],
      }),
    });

    const entry = viewWithoutMenu().entries[0];

    // The reply still reads; the row renders nothing rather than empty frames.
    expect(entry?.kind === 'products' && entry.products).toEqual([]);
    expect(entry?.kind === 'products' && entry.reply).toBeTruthy();
  });

  it('holds nothing in the dock, since cards wait on nobody', () => {
    const { actions, view } = setup();

    actions.turnAppended({
      id: 'a1',
      turn: turn({
        type: 'products',
        reply: '\u9019\u4e9b\u662f\u6211\u5011\u7684\u98f2\u6599\u3002',
        productIds: ['prod-tea'],
      }),
    });

    expect(view().dock).toBeNull();
    expect(view().openPrompt).toBeNull();
  });
});
