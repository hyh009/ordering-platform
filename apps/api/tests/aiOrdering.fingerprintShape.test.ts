import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { aiOrderingModelArgumentSchemas } from '../src/modules/aiOrdering/modelResponse.js';
import { toGeminiToolSchema } from '../src/modules/aiOrdering/runtime/geminiSchema.js';
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
