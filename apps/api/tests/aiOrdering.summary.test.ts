import { describe, expect, it, vi } from 'vitest';

import {
  buildAiOrderingSummaryTranscript,
  generateAiOrderingSummary,
} from '../src/modules/aiOrdering/summary.js';
import { AI_ORDERING_V1_2026_09_30 } from '../src/modules/aiOrdering/versions/index.js';

import type { AiOrderingTurnSnapshot } from '../src/models/aiOrdering/model.js';
import type { AiOrderingSummarizationPlan } from '../src/modules/aiOrdering/history.js';

const NOW = new Date('2026-10-01T00:00:00.000Z');
const config = AI_ORDERING_V1_2026_09_30;

function turn(
  index: number,
  overrides: Partial<AiOrderingTurnSnapshot> = {},
): AiOrderingTurnSnapshot {
  return {
    id: `turn-${index}`,
    message: `訊息 ${index}`,
    versionId: config.versionId,
    versionFingerprint: 'test-fingerprint',
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

function plan(turns: AiOrderingTurnSnapshot[]): AiOrderingSummarizationPlan {
  return { turns, coversUpToTurnIndex: turns.length };
}

describe('AI ordering summary transcript', () => {
  it('renders each turn as the guest message and the reply they saw', () => {
    const transcript = buildAiOrderingSummaryTranscript([turn(1), turn(2)]);

    expect(transcript).toContain('Guest: 訊息 1');
    expect(transcript).toContain('Assistant (message): 回覆 1');
    expect(transcript).toContain('Guest: 訊息 2');
  });

  it('carries reported outcomes, because a refusal changes the next reply', () => {
    const transcript = buildAiOrderingSummaryTranscript([
      turn(1, {
        reportedOutcomes: [
          { operationId: 'op-1', outcome: 'rejected' },
          { operationId: 'op-2', outcome: 'accepted' },
        ],
      }),
    ]);

    // "They turned the tea down" is worth carrying forward; "they ordered rice"
    // is already visible in the cart.
    expect(transcript).toContain('op-1: rejected');
    expect(transcript).toContain('op-2: accepted');
  });
});

describe('AI ordering summary generation', () => {
  it('passes the version instructions and the transcript to the model', async () => {
    const callSummaryModel = vi.fn(async () => '客人點了兩杯飲料。');

    await generateAiOrderingSummary({
      plan: plan([turn(1)]),
      config,
      callSummaryModel,
    });

    expect(callSummaryModel).toHaveBeenCalledWith({
      instructions: config.summaryInstructions,
      transcript: expect.stringContaining('訊息 1'),
    });
  });

  it('returns the summary and the index it covers', async () => {
    const result = await generateAiOrderingSummary({
      plan: plan([turn(1), turn(2), turn(3)]),
      config,
      callSummaryModel: async () => '  客人點了兩杯飲料。  ',
    });

    expect(result).toEqual({
      summary: '客人點了兩杯飲料。',
      coversUpToTurnIndex: 3,
    });
  });

  it('caps the summary at the version length budget', async () => {
    const result = await generateAiOrderingSummary({
      plan: plan([turn(1)]),
      config,
      callSummaryModel: async () =>
        'a'.repeat(config.maxSummaryCharacters + 50),
    });

    // The summary is fed back into the next turn's context, so an unbounded one
    // would quietly undo the point of windowing the history.
    expect(result?.summary).toHaveLength(config.maxSummaryCharacters);
  });

  it('skips when the model returned nothing usable', async () => {
    const result = await generateAiOrderingSummary({
      plan: plan([turn(1)]),
      config,
      callSummaryModel: async () => '   ',
    });

    // Recoverable: the next batch rebuilds from the same original turns.
    expect(result).toBeNull();
  });

  it('does not call the model when there is nothing to summarise', async () => {
    const callSummaryModel = vi.fn(async () => 'should not happen');

    const result = await generateAiOrderingSummary({
      plan: plan([]),
      config,
      callSummaryModel,
    });

    expect(result).toBeNull();
    expect(callSummaryModel).not.toHaveBeenCalled();
  });
});
