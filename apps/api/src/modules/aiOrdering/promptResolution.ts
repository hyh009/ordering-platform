import { readAiOrderingAppliedOperations } from '@src/models/aiOrdering/model';

import type { AiOrderingOperationResult } from '@repo/shared';
import type {
  AiOrderingConversationEntity,
  AiOrderingProposalSnapshot,
} from '@src/models/aiOrdering/model';
import type {
  AiOrderingProposalLogEntry,
  AiOrderingResolvedPrompt,
} from '@src/modules/aiOrdering/types';

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
 * A proposal together with the 1-based number of the turn that made it.
 *
 * The number is the proposal's address in the prompt: the model is shown the
 * conversation with every turn numbered, so an operation can be attributed to a
 * turn the model can point at instead of to "earlier".
 */
export type AiOrderingNumberedProposal = {
  turnNumber: number;
  proposal: AiOrderingProposalSnapshot;
};

/** Every turn that carried a proposal, oldest first, each with its turn number. */
function readAiOrderingNumberedProposals(
  conversation: AiOrderingConversationEntity | null,
): AiOrderingNumberedProposal[] {
  const numbered: AiOrderingNumberedProposal[] = [];

  (conversation?.turns ?? []).forEach((turn, index) => {
    if (turn.proposal) {
      numbered.push({ turnNumber: index + 1, proposal: turn.proposal });
    }
  });

  return numbered;
}

/**
 * The most recent proposal in the conversation, decided or not.
 *
 * Only the LAST one: a proposal is good for the turn that made it, so every
 * earlier proposal has already been settled by the message that followed it.
 */
export function readAiOrderingLastProposal(
  conversation: AiOrderingConversationEntity | null,
): AiOrderingNumberedProposal | null {
  return readAiOrderingNumberedProposals(conversation).at(-1) ?? null;
}

/** How many settled proposals the model is shown. Older ones are in the summary. */
const AI_ORDERING_MAX_EARLIER_PROPOSALS = 10;

/**
 * Every proposal before the most recent one, oldest first, with its results.
 *
 * Each as it was APPLIED: where the guest changed a choice before accepting,
 * the model is shown the operation that reached the cart. The proposed one is
 * still stored, but repeating it here would state the option the guest
 * replaced as a fact about the cart.
 *
 * A proposal with no recorded decision here was overtaken without one being
 * written, which only a data fault produces; it is reported with no results and
 * reads as lapsed.
 */
export function readAiOrderingEarlierProposals(
  conversation: AiOrderingConversationEntity | null,
): AiOrderingProposalLogEntry[] {
  return readAiOrderingNumberedProposals(conversation)
    .slice(0, -1)
    .slice(-AI_ORDERING_MAX_EARLIER_PROPOSALS)
    .map(({ turnNumber, proposal }) => ({
      turnNumber,
      ...readAiOrderingAppliedOperations(proposal),
      results: proposal.decision?.results ?? [],
    }));
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
  return (
    readAiOrderingLastProposal(conversation)?.proposal.decision?.results ?? []
  );
}

/**
 * The results that settle a proposal nobody answered: every operation untouched.
 *
 * Its own outcome rather than `rejected` or `no_action`. Not `rejected`, because
 * the guest did not refuse these — they moved on, and may still want them. Not
 * `no_action`, which means the guest accepted and a failure stopped the proposal
 * before this operation was reached. Those read differently to the model and to
 * the guest, so they are separate values.
 */
export function buildAiOrderingSupersededResults(
  proposal: AiOrderingProposalSnapshot,
): AiOrderingOperationResult[] {
  return proposal.operations.map((operation) => ({
    operationId: operation.operationId,
    outcome: 'superseded' as const,
  }));
}
