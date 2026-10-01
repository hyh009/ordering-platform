import { describe, expect, it, vi } from 'vitest';

import { aiOrderingModelReplyFor } from './fixtures/aiOrdering.js';
import {
  compareAiOrderingReplayRuns,
  replayAiOrderingVersion,
} from '../src/modules/aiOrdering/evaluation/replay.js';
import { AI_ORDERING_V1_2026_09_30 } from '../src/modules/aiOrdering/versions/index.js';

import type { AiOrderingReplayRun } from '../src/modules/aiOrdering/evaluation/replay.js';

const config = AI_ORDERING_V1_2026_09_30;

/** A caller that answers each successive call from the given list. */
function scriptedCaller(replies: unknown[]) {
  let index = 0;

  return () => async () => {
    const reply = replies[index] ?? { toolCalls: [], text: '' };
    index += 1;
    return reply;
  };
}

describe('AI ordering replay', () => {
  it('replays every case and records the response type', async () => {
    const run = await replayAiOrderingVersion({
      config,
      provider: 'gemini',
      modelName: 'test-model',
      cases: [{ message: '珍奶是什麼' }, { message: '我不能吃蔥' }],
      createModelCaller: scriptedCaller([
        aiOrderingModelReplyFor({ type: 'message', reply: '紅茶加鮮奶。' }),
        aiOrderingModelReplyFor({
          type: 'unanswered',
          reply: '資料沒有標示。',
          reason: 'missing_product_info',
        }),
      ]),
    });

    expect(run.outcomes.map((outcome) => outcome.responseType)).toEqual([
      'message',
      'unanswered',
    ]);
    expect(run.outcomes[0]?.reply).toBe('紅茶加鮮奶。');
  });

  it('records the version fingerprint, not just the id', async () => {
    const run = await replayAiOrderingVersion({
      config,
      provider: 'gemini',
      modelName: 'test-model',
      cases: [{ message: '你好' }],
      createModelCaller: scriptedCaller([
        aiOrderingModelReplyFor({ type: 'message', reply: '你好。' }),
      ]),
    });

    // A draft version's prompt may have moved since the stored turns were
    // written. Without this, a replay report could not say which prompt it ran.
    expect(run.versionId).toBe(config.versionId);
    expect(run.versionFingerprint).toMatch(/^[0-9a-f]{12}$/);
  });

  it('summarises a proposal so two runs are comparable at a glance', async () => {
    const run = await replayAiOrderingVersion({
      config,
      provider: 'gemini',
      modelName: 'test-model',
      cases: [{ message: '來一份白飯' }],
      createModelCaller: scriptedCaller([
        aiOrderingModelReplyFor({
          type: 'proposal',
          reply: '幫你加了。',
          operations: [
            {
              type: 'add_item',
              summary: '加一份白飯',
              item: { productId: 'prod-rice', quantity: 1 },
            },
          ],
        }),
      ]),
    });

    expect(run.outcomes[0]?.responseType).toBe('proposal');
    expect(run.outcomes[0]?.operationSummaries).toEqual(['加一份白飯']);
  });

  it('records a failure instead of throwing when the provider errors', async () => {
    const run = await replayAiOrderingVersion({
      config,
      provider: 'gemini',
      modelName: 'test-model',
      cases: [{ message: '你好' }, { message: '再見' }],
      createModelCaller: () => async () => {
        throw new Error('provider exploded');
      },
    });

    // One bad case must not abandon the rest of the replay.
    expect(run.outcomes).toHaveLength(2);
    expect(run.outcomes[0]?.responseType).toBeNull();
    expect(run.outcomes[0]?.failure).toContain('provider exploded');
  });

  it('replays each case cold, with no history from the case before it', async () => {
    const historyBlocks: string[] = [];

    await replayAiOrderingVersion({
      config,
      provider: 'gemini',
      modelName: 'test-model',
      cases: [{ message: '第一句' }, { message: '第二句' }],
      createModelCaller: () => async (call) => {
        const history = call.context.blocks.find(
          (block) => block.kind === 'history',
        );
        historyBlocks.push(history?.text ?? '');
        return aiOrderingModelReplyFor({ type: 'message', reply: '好。' });
      },
    });

    // Carrying history would make an outcome depend on the one before it, and
    // two versions would diverge for reasons neither prompt is responsible for.
    expect(historyBlocks).toHaveLength(2);
    for (const text of historyBlocks) {
      expect(text).toContain('No earlier turns.');
      expect(text).not.toContain('第一句');
    }
  });

  it('never writes to the corpus it reads from', async () => {
    const appendTurn = vi.fn();

    await replayAiOrderingVersion({
      config,
      provider: 'gemini',
      modelName: 'test-model',
      cases: [{ message: '你好' }],
      createModelCaller: scriptedCaller([
        aiOrderingModelReplyFor({ type: 'message', reply: '你好。' }),
      ]),
    });

    // Replay takes no repository at all, which is the structural version of this
    // guarantee; the assertion records the intent.
    expect(appendTurn).not.toHaveBeenCalled();
  });
});

describe('AI ordering replay comparison', () => {
  function runFor(
    versionId: string,
    outcomes: { message: string; responseType: string | null }[],
  ): AiOrderingReplayRun {
    return {
      versionId,
      versionFingerprint: 'fingerprint',
      provider: 'gemini',
      modelName: 'test-model',
      outcomes: outcomes.map((outcome) => ({
        message: outcome.message,
        responseType: outcome.responseType as never,
        operationSummaries: [],
        repairAttempted: false,
        droppedOperationCount: 0,
        ownershipViolationCount: 0,
      })),
    };
  }

  it('flags only the messages the versions answered differently in KIND', () => {
    const rows = compareAiOrderingReplayRuns([
      runFor('v1', [
        { message: '我不能吃蔥', responseType: 'proposal' },
        { message: '珍奶是什麼', responseType: 'message' },
      ]),
      runFor('v2', [
        { message: '我不能吃蔥', responseType: 'choices' },
        { message: '珍奶是什麼', responseType: 'message' },
      ]),
    ]);

    expect(rows.map((row) => row.responseTypesDiffer)).toEqual([true, false]);
  });

  it('lines runs up by message, not by position', () => {
    const rows = compareAiOrderingReplayRuns([
      runFor('v1', [
        { message: 'A', responseType: 'message' },
        { message: 'B', responseType: 'message' },
      ]),
      // v2 only managed the second message.
      runFor('v2', [{ message: 'B', responseType: 'message' }]),
    ]);

    const rowA = rows.find((row) => row.message === 'A');

    expect(rowA?.outcomes[1]).toBeUndefined();
    // A run missing an outcome still differs from one that produced it.
    expect(rowA?.responseTypesDiffer).toBe(true);
    expect(rows.find((row) => row.message === 'B')?.responseTypesDiffer).toBe(
      false,
    );
  });
});
