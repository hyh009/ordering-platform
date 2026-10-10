import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { aiOrderingModelArgumentSchemas } from '../src/modules/aiOrdering/modelResponse.js';
import { toGeminiToolSchema } from '../src/modules/aiOrdering/runtime/geminiSchema.js';
import { aiOrderingToolDefinitions } from '../src/modules/aiOrdering/tools.js';
import { aiOrderingVersionFingerprint } from '../src/modules/aiOrdering/versions/fingerprint.js';
import { AI_ORDERING_V1_2026_09_30 } from '../src/modules/aiOrdering/versions/index.js';

describe('AI ordering fingerprint covers the answer shape', () => {
  it('changes when the shape the model must answer in changes', async () => {
    const before = aiOrderingVersionFingerprint(AI_ORDERING_V1_2026_09_30);

    vi.resetModules();
    vi.doMock('@src/modules/aiOrdering/modelResponse', () => ({
      aiOrderingModelArgumentSchemas: {
        ...aiOrderingModelArgumentSchemas,
        message: z.object({
          reply: z.string(),
          // One added field is the whole point: the prompt is untouched, so
          // without the shape in the hash this version would be indistinguishable
          // from the one above.
          tone: z.string(),
        }),
      },
    }));

    const reloaded = await import(
      '../src/modules/aiOrdering/versions/fingerprint.js'
    );

    expect(reloaded.aiOrderingVersionFingerprint(AI_ORDERING_V1_2026_09_30)).not.toBe(
      before,
    );

    vi.doUnmock('@src/modules/aiOrdering/modelResponse');
    vi.resetModules();
  });

  it('hashes the shape before the provider rewrites it', () => {
    const raw = JSON.stringify(
      z.toJSONSchema(aiOrderingModelArgumentSchemas.proposal, { io: 'input' }),
    );
    const gemini = JSON.stringify(
      toGeminiToolSchema(aiOrderingModelArgumentSchemas.proposal),
    );

    // The two really do differ — `const` becomes `enum`, `oneOf` becomes
    // `anyOf` — so "before the rewrite" is a meaningful choice and not a
    // distinction without a difference. Hashing the rewritten form would make a
    // Gemini dialect fix read as a version change, and would give the same
    // version two fingerprints when served through two providers.
    expect(gemini).not.toBe(raw);
  });

  it('cannot see the provider at all', () => {
    // Structural, not a convention: the version config carries no provider or
    // model, because the provider and the model are recorded per turn so that
    // axis stays separate from the prompt version.
    expect(Object.keys(AI_ORDERING_V1_2026_09_30)).not.toContain('provider');
    expect(Object.keys(AI_ORDERING_V1_2026_09_30)).not.toContain('modelName');
  });
});

describe('AI ordering fingerprint covers the tool descriptions', () => {
  it('changes when a tool description changes', async () => {
    const before = aiOrderingVersionFingerprint(AI_ORDERING_V1_2026_09_30);

    vi.resetModules();
    vi.doMock('@src/modules/aiOrdering/tools', () => ({
      aiOrderingToolDefinitions: aiOrderingToolDefinitions.map((tool) =>
        tool.name === 'ask_choices'
          ? // One reworded tool is the whole point. The instructions and the
            // answer shape are untouched, and this is the half of the prompt
            // that decides which answer the model gives.
            { ...tool, description: `${tool.description}\nOffer at most 5.` }
          : tool,
      ),
    }));

    const reloaded = await import(
      '../src/modules/aiOrdering/versions/fingerprint.js'
    );

    expect(
      reloaded.aiOrderingVersionFingerprint(AI_ORDERING_V1_2026_09_30),
    ).not.toBe(before);

    vi.doUnmock('@src/modules/aiOrdering/tools');
    vi.resetModules();
  });

  it('does not change when the tools are merely reordered', async () => {
    const before = aiOrderingVersionFingerprint(AI_ORDERING_V1_2026_09_30);

    vi.resetModules();
    vi.doMock('@src/modules/aiOrdering/tools', () => ({
      // The model is given a set, not a sequence, so the order it is written in
      // is not something a stored turn should be distinguished by.
      aiOrderingToolDefinitions: [...aiOrderingToolDefinitions].reverse(),
    }));

    const reloaded = await import(
      '../src/modules/aiOrdering/versions/fingerprint.js'
    );

    expect(reloaded.aiOrderingVersionFingerprint(AI_ORDERING_V1_2026_09_30)).toBe(
      before,
    );

    vi.doUnmock('@src/modules/aiOrdering/tools');
    vi.resetModules();
  });
});
