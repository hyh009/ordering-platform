import { aiOrderingModelResponseSchema } from '@src/modules/aiOrdering/modelResponse';

import type { AiOrderingModelResponse } from '@src/modules/aiOrdering/modelResponse';
import type { AiOrderingVersionConfig } from '@src/modules/aiOrdering/types';

export type AiOrderingGateRejectionCode =
  | 'schema_invalid'
  | 'reply_too_long'
  | 'too_many_operations';

export type AiOrderingGateRejection = {
  code: AiOrderingGateRejectionCode;
  detail: string;
};

export type AiOrderingGateResult =
  | { ok: true; modelResponse: AiOrderingModelResponse }
  | { ok: false; rejection: AiOrderingGateRejection };

/**
 * The boundary between untrusted model output and everything else.
 *
 * Synchronous and pure: shape only, no menu or cart access. Checking a proposed
 * operation against real data is a separate stage (`validation.ts`) because it
 * needs data this one deliberately does not take, and keeping them apart is what
 * lets this gate stay trivially testable against hand-written hostile output.
 *
 * Treat the input as hostile. It arrived from a language model.
 */
export function inspectAiOrderingModelOutput(
  output: unknown,
  config: AiOrderingVersionConfig,
): AiOrderingGateResult {
  const parsed = aiOrderingModelResponseSchema.safeParse(output);

  if (!parsed.success) {
    return {
      ok: false,
      rejection: {
        code: 'schema_invalid',
        detail: parsed.error.issues
          .map(
            (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
          )
          .join('; '),
      },
    };
  }

  const modelResponse = parsed.data;

  // Length and count caps live here rather than in the schema so one version can
  // tighten them without forking the schema, and so the rejection says which cap
  // was hit instead of surfacing a generic schema error.
  if (modelResponse.reply.length > config.maxReplyCharacters) {
    return {
      ok: false,
      rejection: {
        code: 'reply_too_long',
        detail: `reply is ${modelResponse.reply.length} characters, over the ${config.maxReplyCharacters} allowed`,
      },
    };
  }

  if (
    modelResponse.type === 'proposal' &&
    modelResponse.operations.length > config.maxOperationsPerProposal
  ) {
    return {
      ok: false,
      rejection: {
        code: 'too_many_operations',
        detail: `${modelResponse.operations.length} operations, over the ${config.maxOperationsPerProposal} allowed`,
      },
    };
  }

  return { ok: true, modelResponse };
}
