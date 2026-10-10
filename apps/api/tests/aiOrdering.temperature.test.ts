import { describe, expect, it, vi } from 'vitest';

import { AI_ORDERING_V1_2026_09_30 } from '../src/modules/aiOrdering/versions/index.js';

import type { AiOrderingTextModel } from '../src/modules/aiOrdering/runtime/model.js';

/**
 * The version's sampling temperature reaches every provider call.
 *
 * Checked rather than trusted because the gap it closes was invisible: the
 * evaluation harness pinned temperature 0 while production left it unset and
 * took Gemini's default, so every suite score described a configuration that
 * was never served. Nothing failed — the two paths simply disagreed, and only
 * reading both constructors side by side showed it.
 *
 * The adapter is mocked to record what it was handed. The alternative is
 * reading the field back off a constructed LangChain model, which asserts that
 * one vendor's class keeps one property name.
 */
describe('AI ordering temperature reaches the provider', () => {
  async function resolveWithRecordedTemperatures() {
    const chatCalls: (number | undefined)[] = [];
    const textCalls: (number | undefined)[] = [];

    vi.resetModules();
    vi.doMock('@src/modules/aiOrdering/runtime/providers', () => ({
      aiOrderingProviderIds: ['gemini'],
      resolveAiOrderingProvider: () => ({
        id: 'gemini',
        adapter: {
          createChatModel: (input: { temperature?: number }) => {
            chatCalls.push(input.temperature);

            return {};
          },
          createTextModel: (input: { temperature?: number }) => {
            textCalls.push(input.temperature);

            return {
              invoke: () => Promise.resolve({ content: '' }),
            } satisfies AiOrderingTextModel;
          },
          toToolSchema: (schema: unknown) => schema as Record<string, unknown>,
        },
      }),
    }));

    const { resolveAiOrderingRuntime } = await import(
      '../src/modules/aiOrdering/runtime/index.js'
    );

    const runtime = resolveAiOrderingRuntime({
      versionId: AI_ORDERING_V1_2026_09_30.versionId,
      provider: 'gemini',
      apiKey: 'a-key-that-exists',
      modelName: 'gemini-3.5-flash-lite',
    });

    return { runtime, chatCalls, textCalls };
  }

  it('passes the version temperature to the model that answers a turn', async () => {
    const { runtime, chatCalls } = await resolveWithRecordedTemperatures();

    runtime?.createChatModel();

    expect(chatCalls).toEqual([AI_ORDERING_V1_2026_09_30.temperature]);

    vi.doUnmock('@src/modules/aiOrdering/runtime/providers');
    vi.resetModules();
  });

  it('passes it to the summary model too', async () => {
    const { runtime, textCalls } = await resolveWithRecordedTemperatures();

    runtime?.createSummaryCaller();

    // The summary is fed into later turns, so a sampled one makes the whole
    // conversation irreproducible rather than just the turn that wrote it.
    expect(textCalls).toEqual([AI_ORDERING_V1_2026_09_30.temperature]);

    vi.doUnmock('@src/modules/aiOrdering/runtime/providers');
    vi.resetModules();
  });

  it('never leaves it to the provider default', async () => {
    const { runtime, chatCalls, textCalls } =
      await resolveWithRecordedTemperatures();

    runtime?.createChatModel();
    runtime?.createSummaryCaller();

    // An omitted value means "whatever the vendor defaults to", which is the
    // one thing this must never be: it is what made the suite and production
    // disagree.
    for (const recorded of [...chatCalls, ...textCalls]) {
      expect(recorded).not.toBeUndefined();
    }

    vi.doUnmock('@src/modules/aiOrdering/runtime/providers');
    vi.resetModules();
  });
});
