import type { AiOrderingOperationResult } from '@repo/shared';
import type { AiOrderingConversationEntity } from '@src/models/aiOrdering/model';
import type { AiOrderingResolvedPrompt } from '@src/modules/aiOrdering/types';

export type AiOrderingPromptResolutionFailure =
  | 'prompt_not_found'
  | 'option_not_found';

export type AiOrderingPromptResolution =
  | { ok: true; resolvedPrompt?: AiOrderingResolvedPrompt }
  | { ok: false; reason: AiOrderingPromptResolutionFailure };

/**
 * Resolves a `responseToPromptId` against the guest's OWN conversation.
 *
 * Starting the lookup from this guest's conversation is what makes another
 * guest's prompt id unreachable: it is simply not found. That is structural
 * rather than a permission check someone could forget to write.
 */
export function resolveAiOrderingPrompt(
  conversation: AiOrderingConversationEntity | null,
  request: {
    responseToPromptId?: string | undefined;
    selectedOptionId?: string | undefined;
  },
): AiOrderingPromptResolution {
  if (!request.responseToPromptId) {
    return { ok: true };
  }

  const prompt = conversation?.turns
    .map((turn) => turn.prompt)
    .find((candidate) => candidate?.promptId === request.responseToPromptId);

  if (!prompt) {
    return { ok: false, reason: 'prompt_not_found' };
  }

  if (!request.selectedOptionId) {
    // Legitimate: a choices response always allows free text, so a guest may
    // answer the question by typing instead of picking an option.
    return {
      ok: true,
      resolvedPrompt: { promptId: prompt.promptId, question: prompt.question },
    };
  }

  const selectedOption = prompt.options.find(
    (option) => option.id === request.selectedOptionId,
  );

  if (!selectedOption) {
    return { ok: false, reason: 'option_not_found' };
  }

  return {
    ok: true,
    resolvedPrompt: {
      promptId: prompt.promptId,
      question: prompt.question,
      selectedOption,
    },
  };
}

export type AiOrderingOutcomeResolution = {
  /** Outcomes that matched operations in the proposal they claim to answer. */
  results: AiOrderingOperationResult[];
  /** True when the report named a proposal this conversation never issued. */
  unknownProposal: boolean;
};

/**
 * Matches a reported outcome against the proposal the backend actually made.
 *
 * A client could otherwise report outcomes for operations that were never
 * proposed, which would poison both the model's next turn and the evaluation
 * corpus. Only outcomes naming an operation in the stored proposal survive.
 *
 * An unreported proposal is not an error worth refusing the turn over — the
 * guest is mid-conversation and a stale client is not their fault — so it is
 * reported back to the caller to log rather than thrown.
 */
export function resolveAiOrderingReportedOutcomes(
  conversation: AiOrderingConversationEntity | null,
  previousOutcome:
    | { proposalId: string; results: AiOrderingOperationResult[] }
    | undefined,
): AiOrderingOutcomeResolution {
  if (!previousOutcome) {
    return { results: [], unknownProposal: false };
  }

  const proposal = conversation?.turns
    .map((turn) => turn.proposal)
    .find((candidate) => candidate?.proposalId === previousOutcome.proposalId);

  if (!proposal) {
    return { results: [], unknownProposal: true };
  }

  const proposedIds = new Set(
    proposal.operations.map((operation) => operation.operationId),
  );

  return {
    results: previousOutcome.results.filter((result) =>
      proposedIds.has(result.operationId),
    ),
    unknownProposal: false,
  };
}
