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
/**
 * The outcome of the most recent proposal, if it has one.
 *
 * Read from what the backend RECORDED when it executed, never from anything the
 * client sends. That is the point of executing server-side: an outcome can no
 * longer be claimed for operations that were never proposed, and it exists
 * whether or not the guest spoke again.
 */
export function readAiOrderingLastProposalOutcome(
  conversation: AiOrderingConversationEntity | null,
): AiOrderingOperationResult[] {
  const proposals = (conversation?.turns ?? [])
    .map((turn) => turn.proposal)
    .filter((proposal) => proposal !== undefined);

  return proposals.at(-1)?.decision?.results ?? [];
}
