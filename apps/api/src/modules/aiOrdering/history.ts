import type {
  AiOrderingConversationEntity,
  AiOrderingTurnSnapshot,
} from '@src/models/aiOrdering/model';
import type { AiOrderingHistoryTurn } from '@src/modules/aiOrdering/types';

export type AiOrderingHistoryWindow = {
  /** Most recent last, capped by the version's `maxHistoryTurns`. */
  history: AiOrderingHistoryTurn[];
  /** The rolling summary covering everything older than the window. */
  summary?: string;
};

/**
 * Windows a conversation into what the model sees this turn.
 *
 * This is a cap on what is SENT, and it is entirely separate from
 * `AI_ORDERING_MAX_TURNS_PER_CONVERSATION`, which caps what is STORED. Every
 * turn stays stored forever — the merchant review surface and the replay corpus
 * both need the originals — and only the model's view is trimmed. Do not unify
 * the two numbers.
 *
 * Each turn is reduced to its number, the guest message, the reply they saw,
 * and the response type. The raw model output is never included: it is stored for
 * offline evaluation, not to be fed back to a model.
 */
export function windowAiOrderingHistory(
  conversation: AiOrderingConversationEntity | null,
  maxHistoryTurns: number,
): AiOrderingHistoryWindow {
  if (!conversation) {
    return { history: [] };
  }

  const windowStart = Math.max(0, conversation.turns.length - maxHistoryTurns);

  return {
    // Numbered from the conversation, not from the window, so a turn keeps the
    // number it had when it was written and the proposal log can name it.
    history: conversation.turns.slice(windowStart).map((turn, index) => ({
      turnNumber: windowStart + index + 1,
      message: turn.message,
      reply: turn.response.reply,
      responseType: turn.response.type,
    })),
    ...(conversation.summary !== undefined
      ? { summary: conversation.summary }
      : {}),
  };
}

export type AiOrderingSummarizationPlan = {
  /**
   * The ORIGINAL turns to summarise, always starting at index 0.
   *
   * This is the whole point of returning a plan instead of a boolean: the caller
   * is handed source material and never the previous summary, so summarising a
   * summary is not something it can express. Successive rebuilds therefore do
   * not compound loss the way a chain of re-summarised summaries would.
   */
  turns: AiOrderingTurnSnapshot[];
  /** Exclusive turn index the rebuilt summary will cover. */
  coversUpToTurnIndex: number;
};

/**
 * Decides whether the rolling summary should be rebuilt, and from what.
 *
 * Rebuilding from source is affordable here precisely because turns are never
 * deleted: the originals are always on hand, so there is no reason to accept the
 * generation-by-generation decay of summarising a summary. The stored turn
 * ceiling bounds the worst case.
 *
 * Batched by `summarizeAfterAgedOutTurns` so the rebuild is occasional rather
 * than once per turn.
 *
 * Returns `null` when no rebuild is due. Producing the summary itself needs a
 * model call, which the caller owns.
 */
export function planAiOrderingSummarization(
  conversation: AiOrderingConversationEntity | null,
  config: { maxHistoryTurns: number; summarizeAfterAgedOutTurns: number },
): AiOrderingSummarizationPlan | null {
  if (!conversation) {
    return null;
  }

  const windowStart = conversation.turns.length - config.maxHistoryTurns;

  if (windowStart <= 0) {
    return null;
  }

  const alreadyCovered = conversation.summarizedUpToTurnIndex ?? 0;

  if (windowStart - alreadyCovered < config.summarizeAfterAgedOutTurns) {
    return null;
  }

  return {
    turns: conversation.turns.slice(0, windowStart),
    coversUpToTurnIndex: windowStart,
  };
}
