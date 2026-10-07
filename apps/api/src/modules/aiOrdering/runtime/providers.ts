import {
  createGeminiChatModel,
  createGeminiTextModel,
} from '@src/modules/aiOrdering/runtime/gemini';
import { toGeminiToolSchema } from '@src/modules/aiOrdering/runtime/geminiSchema';

import type { AiOrderingTextModel } from '@src/modules/aiOrdering/runtime/model';

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
  /** The chat model the agent run drives. The agent binds the tools. */
  /**
   * `temperature` is the version's, on every path. It stays optional here
   * because the adapter is the wire layer and an omitted value means "the
   * provider's default"; nothing in this repository omits it.
   */
  createChatModel(input: {
    apiKey: string;
    model: string;
    temperature?: number;
  }): unknown;
  /**
   * Rewrites a tool argument schema into this provider's dialect.
   *
   * Lives on the adapter because it is a wire-format concern: the schemas stay
   * written in zod and each provider says what its own parser needs.
   */
  toToolSchema(schema: unknown): Record<string, unknown>;
  /** A plain-text model, with NO tools bound. Used to rebuild the summary. */
  createTextModel(input: {
    apiKey: string;
    model: string;
    temperature?: number;
  }): AiOrderingTextModel;
};

const adapters: Record<AiOrderingProviderId, AiOrderingProviderAdapter> = {
  gemini: {
    createChatModel: createGeminiChatModel,
    toToolSchema: (schema) =>
      toGeminiToolSchema(schema as never) as Record<string, unknown>,
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
