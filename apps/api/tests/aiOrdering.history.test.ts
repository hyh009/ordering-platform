import { describe, expect, it } from 'vitest';

import { AI_ORDERING_MAX_TURNS_PER_CONVERSATION } from '../src/models/aiOrdering/model.js';
import {
  planAiOrderingSummarization,
  windowAiOrderingHistory,
} from '../src/modules/aiOrdering/history.js';
import {
  resolveAiOrderingPrompt,
  resolveAiOrderingReportedOutcomes,
} from '../src/modules/aiOrdering/promptResolution.js';

import type {
  AiOrderingConversationEntity,
  AiOrderingTurnSnapshot,
} from '../src/models/aiOrdering/model.js';

const NOW = new Date('2026-09-30T00:00:00.000Z');

function turn(
  index: number,
  overrides: Partial<AiOrderingTurnSnapshot> = {},
): AiOrderingTurnSnapshot {
  return {
    id: `turn-${index}`,
    message: `訊息 ${index}`,
    versionId: 'v1-2026-09-30',
    provider: 'gemini',
    modelName: 'test-model',
    response: { type: 'message', reply: `回覆 ${index}` },
    quality: {
      repairAttempted: false,
      droppedOperationCount: 0,
      ownershipViolationCount: 0,
    },
    createdAt: NOW,
    ...overrides,
  };
}

function conversation(
  turns: AiOrderingTurnSnapshot[],
  overrides: Partial<AiOrderingConversationEntity> = {},
): AiOrderingConversationEntity {
  return {
    id: 'ai-conversation-1',
    organizationId: 'org-1',
    storeId: 'store-ai-eval',
    cartId: 'cart-ai-eval',
    participantId: 'participant-self',
    turns,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('AI ordering history window', () => {
  it('sends nothing on a guest first turn', () => {
    expect(windowAiOrderingHistory(null, 10)).toEqual({ history: [] });
  });

  it('bounds what the model sees while storage keeps every turn', () => {
    const turns = Array.from({ length: 40 }, (_, index) => turn(index + 1));
    const stored = conversation(turns);

    const windowed = windowAiOrderingHistory(stored, 10);

    // Two different caps: one on what is SENT, one on what is STORED. Unifying
    // them would quietly start discarding the evaluation corpus.
    expect(windowed.history).toHaveLength(10);
    expect(stored.turns).toHaveLength(40);
    expect(AI_ORDERING_MAX_TURNS_PER_CONVERSATION).toBeGreaterThan(10);
  });

  it('keeps the most recent turns, most recent last', () => {
    const turns = Array.from({ length: 5 }, (_, index) => turn(index + 1));

    const windowed = windowAiOrderingHistory(conversation(turns), 2);

    expect(windowed.history.map((entry) => entry.message)).toEqual([
      '訊息 4',
      '訊息 5',
    ]);
  });

  it('compacts a turn to message, reply and response type only', () => {
    const windowed = windowAiOrderingHistory(
      conversation([turn(1, { modelOutput: { secret: 'raw model output' } })]),
      10,
    );

    // The raw model output is stored for offline evaluation, never fed back.
    expect(Object.keys(windowed.history[0] ?? {}).sort()).toEqual([
      'message',
      'reply',
      'responseType',
    ]);
    expect(JSON.stringify(windowed.history)).not.toContain('raw model output');
  });

  it('carries the rolling summary alongside the window', () => {
    const windowed = windowAiOrderingHistory(
      conversation([turn(1)], { summary: '客人點了兩杯飲料。' }),
      10,
    );

    expect(windowed.summary).toBe('客人點了兩杯飲料。');
  });

  describe('summarisation plan', () => {
    const config = { maxHistoryTurns: 10, summarizeAfterAgedOutTurns: 5 };

    it('plans nothing while everything still fits in the window', () => {
      const turns = Array.from({ length: 5 }, (_, index) => turn(index + 1));

      expect(
        planAiOrderingSummarization(conversation(turns), config),
      ).toBeNull();
    });

    it('waits for a batch rather than rebuilding on every turn past the window', () => {
      // 11 turns: one has aged out, which is not yet worth a model call.
      const turns = Array.from({ length: 11 }, (_, index) => turn(index + 1));

      expect(
        planAiOrderingSummarization(conversation(turns), config),
      ).toBeNull();
    });

    it('plans a rebuild once a full batch has aged out', () => {
      const turns = Array.from({ length: 15 }, (_, index) => turn(index + 1));

      const plan = planAiOrderingSummarization(conversation(turns), config);

      expect(plan?.coversUpToTurnIndex).toBe(5);
    });

    it('always hands back the ORIGINAL turns, starting at index 0', () => {
      const turns = Array.from({ length: 20 }, (_, index) => turn(index + 1));

      const plan = planAiOrderingSummarization(
        conversation(turns, {
          summarizedUpToTurnIndex: 5,
          summary: 'an earlier summary that must not be the input',
        }),
        config,
      );

      // Rebuilding from source is what stops successive summaries compounding
      // their losses. The caller is never handed the previous summary, so
      // summarising a summary is not something it can express.
      expect(plan?.turns[0]?.message).toBe('訊息 1');
      expect(plan?.turns).toHaveLength(10);
      expect(JSON.stringify(plan)).not.toContain('must not be the input');
    });

    it('does not re-plan until another batch has aged out', () => {
      const turns = Array.from({ length: 15 }, (_, index) => turn(index + 1));

      expect(
        planAiOrderingSummarization(
          conversation(turns, { summarizedUpToTurnIndex: 5 }),
          config,
        ),
      ).toBeNull();
    });
  });
});

describe('AI ordering prompt resolution', () => {
  const promptTurn = turn(1, {
    response: {
      type: 'choices',
      reply: '要什麼甜度？',
      promptId: 'prompt-1',
      question: '要什麼甜度？',
      inputMode: 'single_choice',
      options: [
        { id: 'option-1', label: '半糖' },
        { id: 'option-2', label: '無糖' },
      ],
      allowFreeText: true,
    },
    prompt: {
      promptId: 'prompt-1',
      question: '要什麼甜度？',
      options: [
        { id: 'option-1', label: '半糖' },
        { id: 'option-2', label: '無糖' },
      ],
    },
  });

  it('resolves nothing when the guest is not answering a question', () => {
    const result = resolveAiOrderingPrompt(conversation([promptTurn]), {});

    expect(result).toEqual({ ok: true });
  });

  it('resolves the question and the chosen option label', () => {
    const result = resolveAiOrderingPrompt(conversation([promptTurn]), {
      responseToPromptId: 'prompt-1',
      selectedOptionId: 'option-2',
    });

    if (!result.ok) {
      throw new Error('expected resolution to succeed');
    }

    // A bare option id means nothing to the model on its own.
    expect(result.resolvedPrompt?.question).toBe('要什麼甜度？');
    expect(result.resolvedPrompt?.selectedOption?.label).toBe('無糖');
  });

  it('resolves the prompt with no option when the guest typed instead', () => {
    const result = resolveAiOrderingPrompt(conversation([promptTurn]), {
      responseToPromptId: 'prompt-1',
    });

    if (!result.ok) {
      throw new Error('expected resolution to succeed');
    }

    expect(result.resolvedPrompt?.selectedOption).toBeUndefined();
  });

  it("does not find another guest's prompt id", () => {
    // The lookup starts from this guest's own conversation, so another guest's
    // prompt is unreachable by construction rather than by a permission check.
    const result = resolveAiOrderingPrompt(conversation([promptTurn]), {
      responseToPromptId: 'prompt-belonging-to-someone-else',
    });

    expect(result).toEqual({ ok: false, reason: 'prompt_not_found' });
  });

  it('rejects an option that the prompt never offered', () => {
    const result = resolveAiOrderingPrompt(conversation([promptTurn]), {
      responseToPromptId: 'prompt-1',
      selectedOptionId: 'option-99',
    });

    expect(result).toEqual({ ok: false, reason: 'option_not_found' });
  });
});

describe('AI ordering reported outcomes', () => {
  const proposalTurn = turn(1, {
    response: {
      type: 'proposal',
      reply: '幫你加白飯。',
      proposalId: 'proposal-1',
      confirmationRequired: true,
      operations: [
        {
          type: 'add_item',
          operationId: 'op-1',
          summary: '白飯 x1',
          item: { productId: 'prod-rice', quantity: 1 },
        },
      ],
    },
    proposal: {
      proposalId: 'proposal-1',
      operations: [
        {
          type: 'add_item',
          operationId: 'op-1',
          summary: '白飯 x1',
          item: { productId: 'prod-rice', quantity: 1 },
        },
      ],
    },
  });

  it('reports nothing when the guest sent no outcome', () => {
    expect(
      resolveAiOrderingReportedOutcomes(
        conversation([proposalTurn]),
        undefined,
      ),
    ).toEqual({ results: [], unknownProposal: false });
  });

  it('keeps outcomes that match the stored proposal', () => {
    const result = resolveAiOrderingReportedOutcomes(
      conversation([proposalTurn]),
      {
        proposalId: 'proposal-1',
        results: [{ operationId: 'op-1', outcome: 'rejected' }],
      },
    );

    expect(result.results).toHaveLength(1);
    expect(result.unknownProposal).toBe(false);
  });

  it('drops outcomes for operations the backend never proposed', () => {
    // A client could otherwise poison both the next turn and the evaluation
    // corpus with outcomes for operations that never existed.
    const result = resolveAiOrderingReportedOutcomes(
      conversation([proposalTurn]),
      {
        proposalId: 'proposal-1',
        results: [
          { operationId: 'op-1', outcome: 'accepted' },
          { operationId: 'op-invented', outcome: 'accepted' },
        ],
      },
    );

    expect(result.results.map((entry) => entry.operationId)).toEqual(['op-1']);
  });

  it('flags a proposal id this conversation never issued', () => {
    const result = resolveAiOrderingReportedOutcomes(
      conversation([proposalTurn]),
      {
        proposalId: 'proposal-never-issued',
        results: [{ operationId: 'op-1', outcome: 'accepted' }],
      },
    );

    // Not worth refusing the turn over — the guest is mid-conversation and a
    // stale client is not their fault — but the caller should log it.
    expect(result).toEqual({ results: [], unknownProposal: true });
  });
});
