import type { AiOrderingReviewTurn } from '@/models/aiOrdering';

/**
 * One stored turn as a review surface reads it.
 *
 * Shared by the merchant's review page and the platform's, because a turn reads
 * the same either way: the two surfaces differ in what else they may see
 * (the prompt) and in how they are reached, never in what a turn is.
 *
 * `wasDegraded` is the signal worth scanning for: a turn where the model's
 * operations were dropped, or where it needed a repair that failed, is the
 * evidence that a prompt version needs work.
 */
export type AiOrderingReviewTurnRow = {
  id: string;
  message: string;
  responseType: AiOrderingReviewTurn['response']['type'];
  reply: string;
  /**
   * What the model answered, formatted for reading.
   *
   * Flattened here rather than in the view because turning arguments into
   * readable JSON is a presentation decision about data, which is the row's
   * job; the view only decides whether to reveal it. Absent when the turn
   * recorded no recognizable output.
   */
  modelOutput?: {
    toolNames: string[];
    /** Pretty-printed tool arguments, in call order. */
    toolArgs: { name: string; json: string }[];
    text: string;
  };
  /**
   * How the turn was reached: what the model was given for this turn, then
   * every call it took. More than one call means an earlier answer was refused,
   * and `feedback` is what the model was told about it.
   */
  modelTrace?: {
    currentTurn: string;
    history?: string;
    preludeHash?: string;
    calls: {
      toolNames: string[];
      feedback?: string;
      toolArgs: { name: string; json: string }[];
      text: string;
      error?: string;
    }[];
  };
  versionId: string;
  versionFingerprint: string;
  modelName: string;
  provider: string;
  repairAttempted: boolean;
  repairSucceeded?: boolean;
  droppedOperationCount: number;
  ownershipViolationCount: number;
  wasDegraded: boolean;
  createdAt: string;
};

/**
 * Tool arguments as text.
 *
 * `JSON.stringify` can return `undefined` (for a function or a bare
 * `undefined`) and throws on a circular structure. Neither should be able to
 * blank out a review page, so both land on a placeholder.
 */
function formatArgs(args: unknown): string {
  try {
    return JSON.stringify(args, null, 2) ?? String(args);
  } catch {
    return '[unserializable]';
  }
}

export function toAiOrderingReviewTurnRow(
  turn: AiOrderingReviewTurn,
): AiOrderingReviewTurnRow {
  const row: AiOrderingReviewTurnRow = {
    id: turn.id,
    message: turn.message,
    responseType: turn.response.type,
    reply: turn.response.reply,
    versionId: turn.versionId,
    versionFingerprint: turn.versionFingerprint,
    modelName: turn.modelName,
    provider: turn.provider,
    repairAttempted: turn.repairAttempted,
    droppedOperationCount: turn.droppedOperationCount,
    ownershipViolationCount: turn.ownershipViolationCount,
    wasDegraded:
      turn.droppedOperationCount > 0 ||
      turn.ownershipViolationCount > 0 ||
      turn.repairSucceeded === false,
    createdAt: turn.createdAt,
  };

  if (turn.repairSucceeded !== undefined) {
    row.repairSucceeded = turn.repairSucceeded;
  }

  if (turn.modelOutput) {
    row.modelOutput = {
      toolNames: turn.modelOutput.toolCalls.map((call) => call.name),
      toolArgs: turn.modelOutput.toolCalls.map((call) => ({
        name: call.name,
        json: formatArgs(call.args),
      })),
      text: turn.modelOutput.text,
    };
  }

  if (turn.modelTrace) {
    row.modelTrace = {
      currentTurn: turn.modelTrace.currentTurn,
      ...(turn.modelTrace.history !== undefined
        ? { history: turn.modelTrace.history }
        : {}),
      ...(turn.modelTrace.preludeHash !== undefined
        ? { preludeHash: turn.modelTrace.preludeHash }
        : {}),
      calls: turn.modelTrace.calls.map((call) => ({
        toolNames: call.toolNames,
        ...(call.feedback !== undefined ? { feedback: call.feedback } : {}),
        toolArgs: (call.output?.toolCalls ?? []).map((toolCall) => ({
          name: toolCall.name,
          json: formatArgs(toolCall.args),
        })),
        text: call.output?.text ?? '',
        ...(call.error !== undefined ? { error: call.error } : {}),
      })),
    };
  }

  return row;
}
