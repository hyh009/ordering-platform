import { AIMessage } from '@langchain/core/messages';
import { fakeModel } from 'langchain';
import { describe, expect, it } from 'vitest';

import {
  compareAiOrderingReplayRuns,
  replayAiOrderingVersion,
} from '../src/modules/aiOrdering/evaluation/replay.js';
import { toGeminiToolSchema } from '../src/modules/aiOrdering/runtime/geminiSchema.js';
import { AI_ORDERING_V1_2026_09_30 } from '../src/modules/aiOrdering/versions/index.js';

import type { AiOrderingReplayRun } from '../src/modules/aiOrdering/evaluation/replay.js';

const config = AI_ORDERING_V1_2026_09_30;

const toToolSchema = (schema: unknown) =>
  toGeminiToolSchema(schema as never) as Record<string, unknown>;

type ScriptedReply = { reply: string } | { tool: { name: string; args: unknown } };

/**
 * A model that answers each successive call from the given list.
 *
 * One model across every case, so a case that consumes two calls (a repair)
 * advances the script the same way the production path would.
 */
function scriptedModel(replies: ScriptedReply[]) {
  const model = fakeModel();

  for (const entry of replies) {
    if ('tool' in entry) {
      model.respondWithTools([
        { name: entry.tool.name, args: entry.tool.args as never, id: 'call_1' },
      ]);
    } else {
      model.respond(new AIMessage(entry.reply));
    }
  }

  return () => model;
}

describe('AI ordering replay', () => {
  it('replays every case and records the response type', async () => {
    const run = await replayAiOrderingVersion({
      config,
      provider: 'gemini',
      modelName: 'test-model',
      cases: [{ message: '珍奶是什麼' }, { message: '我不能吃蔥' }],
      toToolSchema,
      createModel: scriptedModel([
        { reply: '紅茶加鮮奶。' },
        {
          tool: {
            name: 'report_unanswerable',
            args: {
              reply: '資料沒有標示。',
              reason: 'missing_product_info',
            },
          },
        },
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
      toToolSchema,
      createModel: scriptedModel([{ reply: '你好。' }]),
    });

    // A draft version's file can change between two runs that both say the same
    // id, so the id alone would make two reports look comparable when they are
    // not.
    expect(run.versionFingerprint).toMatch(/^[0-9a-f]{12}$/);
    expect(run.versionId).toBe(config.versionId);
  });

  it('summarises a proposal so two runs are comparable at a glance', async () => {
    const run = await replayAiOrderingVersion({
      config,
      provider: 'gemini',
      modelName: 'test-model',
      cases: [{ message: '來一份白飯' }],
      toToolSchema,
      createModel: scriptedModel([
        {
          tool: {
            name: 'propose_cart_operations',
            args: {
              reply: '幫你加白飯。',
              operations: [
                {
                  type: 'add_item',
                  summary: '白飯 x1',
                  item: { productId: 'prod-rice', quantity: 1 },
                },
              ],
            },
          },
        },
      ]),
    });

    expect(run.outcomes[0]?.responseType).toBe('proposal');
    expect(run.outcomes[0]?.operationSummaries).toEqual(['白飯 x1']);
  });

  it('never executes, because the run is never resumed', async () => {
    const run = await replayAiOrderingVersion({
      config,
      provider: 'gemini',
      modelName: 'test-model',
      cases: [{ message: '來一份白飯' }],
      toToolSchema,
      createModel: scriptedModel([
        {
          tool: {
            name: 'propose_cart_operations',
            args: {
              reply: '幫你加白飯。',
              operations: [
                {
                  type: 'add_item',
                  summary: '白飯 x1',
                  item: { productId: 'prod-rice', quantity: 1 },
                },
              ],
            },
          },
        },
      ]),
    });

    // Replay drives the SAME agent production drives, so the report is evidence
    // about the real path. It stays read-only by construction: a proposal pauses
    // the run and nothing ever resumes it, so the tool body is unreachable. The
    // executor it is given throws if that ever stops being true.
    expect(run.outcomes[0]?.failure).toBeUndefined();
    expect(run.outcomes[0]?.responseType).toBe('proposal');
  });

  it('records a failure instead of throwing when the provider errors', async () => {
    const run = await replayAiOrderingVersion({
      config,
      provider: 'gemini',
      modelName: 'test-model',
      cases: [{ message: '你好' }, { message: '再見' }],
      toToolSchema,
      createModel: () => fakeModel().respond(new Error('provider exploded')),
    });

    // One bad case must not abandon the rest of the replay.
    expect(run.outcomes).toHaveLength(2);
    expect(run.outcomes[0]?.responseType).toBeNull();
    expect(run.outcomes[0]?.failure).toContain('provider exploded');
  });

  it('replays each case cold, with no history from the case before it', async () => {
    const model = fakeModel()
      .respond(new AIMessage('好。'))
      .respond(new AIMessage('好。'));

    await replayAiOrderingVersion({
      config,
      provider: 'gemini',
      modelName: 'test-model',
      cases: [{ message: '第一句' }, { message: '第二句' }],
      toToolSchema,
      createModel: () => model,
    });

    // Carrying history would make an outcome depend on the one before it, and
    // two versions would diverge for reasons neither prompt is responsible for.
    expect(model.callCount).toBe(2);

    for (const call of model.calls) {
      const text = call.messages.map((message) => String(message.content)).join('\n');

      expect(text).toContain('No earlier turns.');
      expect(text).not.toContain('第一句\n');
    }
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
