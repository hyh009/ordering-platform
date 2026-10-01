import {
  createGeminiTextModel,
  createGeminiToolCallingModel,
} from '@src/modules/aiOrdering/runtime/gemini';

import type {
  AiOrderingTextModel,
  AiOrderingToolCallingModel,
} from '@src/modules/aiOrdering/runtime/model';

/**
 * The providers the assistant can run against.
 *
 * A provider and a model are ONE choice, not two: `gemini-3.5-flash-lite` exists
 * only behind Google. So the pair is selected together and recorded together on
 * every stored turn.
 *
 * That pair is deliberately NOT part of a prompt version. Replaying an old prompt
 * against a newer model is the point of versioning the prompt, and welding the
 * model into the version would make it impossible: you would have to forge a new
 * version, and then the comparison would carry two differences instead of one.
 * A run is one cell of (prompt version x provider+model).
 *
 * An id names one ROUTE to a model, not a vendor. Reaching Gemini through Vertex
 * instead of AI Studio would be a second id here, because the credential and the
 * construction differ even though the model does not.
 */
export const aiOrderingProviderIds = ['gemini'] as const;

export type AiOrderingProviderId = (typeof aiOrderingProviderIds)[number];

export type AiOrderingProviderAdapter = {
  /** The assistant's own model, with the tools bound. */
  createToolCallingModel(input: {
    apiKey: string;
    model: string;
  }): AiOrderingToolCallingModel;
  /** A plain-text model, with NO tools bound. Used to rebuild the summary. */
  createTextModel(input: {
    apiKey: string;
    model: string;
  }): AiOrderingTextModel;
};

const adapters: Record<AiOrderingProviderId, AiOrderingProviderAdapter> = {
  gemini: {
    createToolCallingModel: createGeminiToolCallingModel,
    createTextModel: createGeminiTextModel,
  },
};

/**
 * Resolves a provider id, or `null` when it names none.
 *
 * `null` rather than a throw, matching how an unknown version id is handled: a
 * misconfigured provider leaves the assistant off and the rest of the API serving
 * ordering, instead of stopping the process from booting.
 */
export function resolveAiOrderingProvider(
  id: string | undefined,
): { id: AiOrderingProviderId; adapter: AiOrderingProviderAdapter } | null {
  const match = aiOrderingProviderIds.find((candidate) => candidate === id);

  return match ? { id: match, adapter: adapters[match] } : null;
}
