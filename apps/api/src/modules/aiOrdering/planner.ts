import { hydrateAiOrderingResponse } from '@src/modules/aiOrdering/modelResponse';
import { inspectAiOrderingModelOutput } from '@src/modules/aiOrdering/outputGate';
import { validateAiOrderingOperations } from '@src/modules/aiOrdering/validation';

import type { AiOrderingResponse } from '@repo/shared';
import type { AiOrderingTurnQualitySignals } from '@src/models/aiOrdering/model';
import type { AiOrderingModelResponse } from '@src/modules/aiOrdering/modelResponse';
import type { AiOrderingGateRejection } from '@src/modules/aiOrdering/outputGate';
import type {
  AiOrderingAssembledContext,
  AiOrderingVersionConfig,
} from '@src/modules/aiOrdering/types';
import type {
  AiOrderingValidationInput,
  AiOrderingValidationResult,
} from '@src/modules/aiOrdering/validation';

export type AiOrderingModelCall = {
  context: AiOrderingAssembledContext;
  /**
   * Present only on the repair attempt. The runtime appends it after the
   * assembled blocks so the cached prefix stays intact.
   */
  repairNote?: string;
};

export type AiOrderingModelCaller = (
  call: AiOrderingModelCall,
) => Promise<unknown>;

type AiOrderingAttempt =
  | { ok: false; modelOutput: unknown; rejection: AiOrderingGateRejection }
  | {
      ok: true;
      modelOutput: unknown;
      modelResponse: AiOrderingModelResponse;
      validation: AiOrderingValidationResult;
    };

export type AiOrderingPlanResult =
  | {
      ok: true;
      response: AiOrderingResponse;
      modelOutput: unknown;
      quality: AiOrderingTurnQualitySignals;
    }
  | {
      ok: false;
      detail: string;
      modelOutput: unknown;
      quality: AiOrderingTurnQualitySignals;
    };

export type AiOrderingPlanInput = {
  config: AiOrderingVersionConfig;
  context: AiOrderingAssembledContext;
  validation: AiOrderingValidationInput;
  /** Resolved from the store setting AND the version's permission. */
  confirmationRequired: boolean;
  callModel: AiOrderingModelCaller;
  newId: (prefix: string) => string;
};

async function runAttempt(
  input: AiOrderingPlanInput,
  repairNote?: string,
): Promise<AiOrderingAttempt> {
  const modelOutput = await input.callModel({
    context: input.context,
    ...(repairNote !== undefined ? { repairNote } : {}),
  });

  const gate = inspectAiOrderingModelOutput(modelOutput, input.config);

  if (!gate.ok) {
    return { ok: false, modelOutput, rejection: gate.rejection };
  }

  return {
    ok: true,
    modelOutput,
    modelResponse: gate.modelResponse,
    validation: validateAiOrderingOperations(
      gate.modelResponse,
      input.validation,
    ),
  };
}

/**
 * Turns an attempt into the correction the model needs, or `null` when the
 * attempt is already usable.
 *
 * The model is told what was wrong in its own terms — which operation, and why —
 * rather than being asked to try again blind.
 */
function describeProblem(attempt: AiOrderingAttempt): string | null {
  if (!attempt.ok) {
    return `Your previous reply could not be used: ${attempt.rejection.detail}. Reply again in the required format.`;
  }

  if (attempt.validation.rejections.length === 0) {
    return null;
  }

  return [
    'Some of the changes you proposed cannot be applied:',
    ...attempt.validation.rejections.map(
      (rejection) => `- change #${rejection.index + 1}: ${rejection.detail}`,
    ),
    'Reply again proposing only changes that are possible, or ask the guest a question instead.',
  ].join('\n');
}

/**
 * Plans one assistant turn: call the model, gate the output, validate the
 * proposed operations, and allow exactly one correction.
 *
 * **At most two model calls.** One correction, never a loop. A model that still
 * gets it wrong after being told precisely what was wrong has a version defect,
 * not a transient failure, and further attempts only make the guest wait. The
 * repair rate and the post-repair failure rate are recorded instead, because
 * they are the sharpest signal for comparing prompt versions.
 *
 * The model answers by calling one of the bound tools, but this is not agent
 * tool calling: nothing executes, and no result is ever fed back for the model to
 * continue reasoning from. It is a single-step correction, and the turn ends
 * either way.
 *
 * Degradation order when things go wrong:
 *
 * 1. Some operations invalid → drop them, keep the rest.
 * 2. All operations invalid → return the model's own reply as a plain message.
 *    Its wording already matches the guest's language, which a backend-authored
 *    fallback string would not.
 * 3. Nothing parsed at all, twice → unusable, and the caller surfaces an error.
 *    There is no text worth showing in that case.
 */
export async function planAiOrderingTurn(
  input: AiOrderingPlanInput,
): Promise<AiOrderingPlanResult> {
  const first = await runAttempt(input);
  const problem = describeProblem(first);

  let repairAttempted = false;
  let repairSucceeded: boolean | undefined;
  let final = first;

  if (problem !== null) {
    repairAttempted = true;
    final = await runAttempt(input, problem);
    repairSucceeded = describeProblem(final) === null;
  }

  const ownershipViolationCount =
    (first.ok ? first.validation.ownershipViolationCount : 0) +
    (repairAttempted && final.ok
      ? final.validation.ownershipViolationCount
      : 0);

  // Prefer the corrected attempt, but do not throw away a usable first attempt
  // just because the correction came back unparseable.
  const usable = final.ok ? final : first.ok ? first : null;

  if (!usable) {
    return {
      ok: false,
      detail: final.ok ? 'unusable model output' : final.rejection.detail,
      modelOutput: final.modelOutput,
      quality: {
        repairAttempted,
        ...(repairSucceeded !== undefined ? { repairSucceeded } : {}),
        droppedOperationCount: 0,
        ownershipViolationCount,
      },
    };
  }

  const quality: AiOrderingTurnQualitySignals = {
    repairAttempted,
    ...(repairSucceeded !== undefined ? { repairSucceeded } : {}),
    droppedOperationCount: usable.validation.rejections.length,
    ownershipViolationCount,
  };

  const { modelResponse, validation } = usable;

  if (modelResponse.type !== 'proposal') {
    return {
      ok: true,
      response: hydrateAiOrderingResponse(modelResponse, {
        confirmationRequired: input.confirmationRequired,
        newId: input.newId,
      }),
      modelOutput: usable.modelOutput,
      quality,
    };
  }

  if (validation.operations.length === 0) {
    // Nothing survived, so there is no proposal to show — but the model's reply
    // is still the right thing to say, in the right language.
    return {
      ok: true,
      response: { type: 'message', reply: modelResponse.reply },
      modelOutput: usable.modelOutput,
      quality,
    };
  }

  return {
    ok: true,
    response: hydrateAiOrderingResponse(
      { ...modelResponse, operations: validation.operations },
      {
        confirmationRequired: input.confirmationRequired,
        newId: input.newId,
      },
    ),
    modelOutput: usable.modelOutput,
    quality,
  };
}
