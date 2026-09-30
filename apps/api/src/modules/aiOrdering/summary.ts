import type { AiOrderingTurnSnapshot } from '@src/models/aiOrdering/model';
import type { AiOrderingSummarizationPlan } from '@src/modules/aiOrdering/history';
import type { AiOrderingVersionConfig } from '@src/modules/aiOrdering/types';

/**
 * Produces summary text from instructions and a transcript.
 *
 * A plain function rather than a model object so this module stays free of
 * provider types, exactly as the planner's caller does. The summary is prose, not
 * one of the four response types, so it cannot go through the structured model.
 */
export type AiOrderingSummaryCaller = (input: {
  instructions: string;
  transcript: string;
}) => Promise<string>;

/**
 * Renders turns for summarisation.
 *
 * Reported outcomes are included because a refusal is one of the two things a
 * summary most needs to carry forward — "they turned the tea down" changes the
 * next reply, while "they ordered rice" is already visible in the cart.
 */
export function buildAiOrderingSummaryTranscript(
  turns: AiOrderingTurnSnapshot[],
): string {
  const lines: string[] = [];

  for (const turn of turns) {
    lines.push(`Guest: ${turn.message}`);
    lines.push(`Assistant (${turn.response.type}): ${turn.response.reply}`);

    for (const outcome of turn.reportedOutcomes ?? []) {
      lines.push(`  - ${outcome.operationId}: ${outcome.outcome}`);
    }
  }

  return lines.join('\n');
}

export type AiOrderingSummaryResult = {
  summary: string;
  coversUpToTurnIndex: number;
};

/**
 * Rebuilds the rolling summary from the plan's original turns.
 *
 * The plan already guarantees the input starts at turn index 0, so this never
 * sees the previous summary and cannot compound its losses. It only has to add
 * the model call and the length cap.
 *
 * Returns `null` when the model produced nothing usable. A missing summary is
 * recoverable — the next batch rebuilds from the same source — so the caller
 * should treat that as a skipped maintenance step rather than a failed turn.
 */
export async function generateAiOrderingSummary(input: {
  plan: AiOrderingSummarizationPlan;
  config: AiOrderingVersionConfig;
  callSummaryModel: AiOrderingSummaryCaller;
}): Promise<AiOrderingSummaryResult | null> {
  const transcript = buildAiOrderingSummaryTranscript(input.plan.turns);

  if (transcript.trim().length === 0) {
    return null;
  }

  const raw = await input.callSummaryModel({
    instructions: input.config.summaryInstructions,
    transcript,
  });

  const summary = raw.trim().slice(0, input.config.maxSummaryCharacters);

  if (summary.length === 0) {
    return null;
  }

  return { summary, coversUpToTurnIndex: input.plan.coversUpToTurnIndex };
}
