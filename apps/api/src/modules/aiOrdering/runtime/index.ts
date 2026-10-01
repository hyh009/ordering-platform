import { env } from '@src/config/env';
import {
  createGeminiTextModel,
  createGeminiToolCallingModel,
} from '@src/modules/aiOrdering/runtime/gemini';
import { createAiOrderingSummaryCaller } from '@src/modules/aiOrdering/runtime/model';
import { resolveAiOrderingVersion } from '@src/modules/aiOrdering/versions';
import { logger } from '@src/utils/logger';

import type { AiOrderingToolCallingModel } from '@src/modules/aiOrdering/runtime/model';
import type { AiOrderingSummaryCaller } from '@src/modules/aiOrdering/summary';
import type { AiOrderingVersionConfig } from '@src/modules/aiOrdering/types';

export type AiOrderingRuntime = {
  config: AiOrderingVersionConfig;
  modelName: string;
  createModel(): AiOrderingToolCallingModel;
  /**
   * Plain-text call used to rebuild the rolling summary.
   *
   * `deadlineAt` is the turn's overall deadline, so a summary rebuild cannot run
   * past it on its own per-call budget.
   */
  createSummaryCaller(deadlineAt?: number): AiOrderingSummaryCaller;
};

export type AiOrderingRuntimeSettings = {
  // `| undefined` is explicit because the project runs with
  // `exactOptionalPropertyTypes`, and the default argument reads env values that
  // are genuinely absent rather than merely unspecified.
  versionId?: string | undefined;
  apiKey?: string | undefined;
  modelName: string;
};

/**
 * Resolves the active runtime, or `null` when the assistant is off.
 *
 * Both halves are required, and neither implies the other:
 *
 * - No version id, or one that names no released version, means off. A
 *   misconfigured id never throws and never silently serves a different
 *   version's prompt.
 * - A version id without an API key also means off, and is logged loudly. A
 *   deployment that believes the assistant is on while it is off is exactly the
 *   sort of thing discovered weeks later.
 *
 * The key alone can never switch the assistant on. Sending guest traffic to a
 * metered provider has to be a deliberate deployment decision, not a side effect
 * of a credential existing in the environment.
 */
export function resolveAiOrderingRuntime(
  settings: AiOrderingRuntimeSettings = {
    versionId: env.AI_ORDERING_VERSION_ID,
    apiKey: env.GEMINI_API_KEY,
    modelName: env.GEMINI_MODEL,
  },
): AiOrderingRuntime | null {
  const config = resolveAiOrderingVersion(settings.versionId);

  if (!config) {
    return null;
  }

  const apiKey = settings.apiKey;

  if (!apiKey) {
    logger.warn(
      { versionId: config.versionId },
      'AI ordering version is configured but no provider API key is set; the assistant stays disabled',
    );

    return null;
  }

  return {
    config,
    modelName: settings.modelName,
    createModel: () =>
      createGeminiToolCallingModel({ apiKey, model: settings.modelName }),
    createSummaryCaller: (deadlineAt?: number) =>
      createAiOrderingSummaryCaller({
        model: createGeminiTextModel({ apiKey, model: settings.modelName }),
        config,
        ...(deadlineAt !== undefined ? { deadlineAt } : {}),
      }),
  };
}

export function isAiOrderingEnabled(): boolean {
  return resolveAiOrderingRuntime() !== null;
}
