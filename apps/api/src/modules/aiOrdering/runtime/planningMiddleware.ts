import { AIMessage } from '@langchain/core/messages';
import { resolveAiOrderingEmptyProposalReply } from '@src/modules/aiOrdering/emptyProposalReply';
import { hydrateAiOrderingResponse } from '@src/modules/aiOrdering/modelResponse';
import { nextAiOrderingCallTimeoutMs } from '@src/modules/aiOrdering/runtime/model';
import {
  AI_ORDERING_PROPOSAL_TOOL,
  runClosingModelCall,
  runPlanningAttempt,
} from '@src/modules/aiOrdering/runtime/modelCall';
import {
  buildAiOrderingIdCodec,
  collectAiOrderingContextIds,
} from '@src/modules/aiOrdering/shortCodes';
import { createMiddleware } from 'langchain';

import type {
  PlanningCallContext,
  PlanningAttempt,
  ParsedPlanningAttempt,
} from '@src/modules/aiOrdering/runtime/modelCall';
import type {
  AiOrderingAgentInput,
  AiOrderingRunRecord,
} from '@src/modules/aiOrdering/runtime/types';

/**
 * Describes what was wrong with an attempt, in the model's own terms.
 *
 * The model is told which change failed and why, rather than being asked to try
 * again blind. `final` is the note for the last attempt, where proposing is no
 * longer possible: it asks for an explanation to the guest instead of another
 * try, because a change that failed for a reason the model cannot fix — a
 * sold-out product, an item that is gone — fails the same way every time.
 */
function describeProblem(
  input: {
    gateDetail?: string;
    rejections: { index: number; detail: string }[];
  },
  final = false,
): string | null {
  if (input.gateDetail === undefined && input.rejections.length === 0) {
    return null;
  }

  const problem =
    input.gateDetail !== undefined
      ? [`Your previous reply could not be used: ${input.gateDetail}.`]
      : [
          final
            ? 'None of the changes you proposed can be applied:'
            : 'Some of the changes you proposed cannot be applied:',
          ...input.rejections.map(
            (rejection) =>
              `- change #${rejection.index + 1}: ${rejection.detail}`,
          ),
        ];

  const instruction = final
    ? 'You can no longer propose cart changes in this turn. If a choice is missing, ask the guest for it. Otherwise tell them what could not be done and the actual reason given above, in the language they wrote in. Do not call it a system error, and do not say that anything was added, changed, or removed.'
    : input.gateDetail !== undefined
      ? 'Reply again in the required format.'
      : 'Reply again in the language the guest wrote in. If a choice is missing, do not fill it in yourself, not even with the default: ask the guest for it instead of proposing. Otherwise propose only the changes that are possible.';

  return [...problem, instruction].join(
    input.gateDetail !== undefined ? ' ' : '\n',
  );
}

type PlanningOutcome =
  | {
      kind:
        | 'initial_success'
        | 'repair_success'
        | 'salvaged'
        | 'fallback_answer';
      attempt: ParsedPlanningAttempt;
    }
  | {
      kind: 'empty_proposal';
      attempt: ParsedPlanningAttempt;
    }
  | { kind: 'unparseable'; attempt: PlanningAttempt };

type PlanningProgress = {
  attempts: PlanningAttempt[];
  repairStarted: boolean;
};

type ProblemOf = (attempt: PlanningAttempt, final?: boolean) => string | null;

async function runPlanningRepairPolicy(
  context: PlanningCallContext,
  problemOf: ProblemOf,
  progress: PlanningProgress,
): Promise<PlanningOutcome> {
  // The first two stages may propose. The final stage has no proposal tool.
  const first = await runPlanningAttempt(context, [], 'initial');
  progress.attempts.push(first);
  const firstProblem = problemOf(first);
  if (firstProblem === null) {
    if (!first.ok) {
      throw new Error('Rejected attempt did not describe a problem');
    }
    return {
      kind: 'initial_success',
      attempt: first,
    };
  }

  progress.repairStarted = true;
  const second = await runPlanningAttempt(
    context,
    [{ message: first.message, note: firstProblem }],
    'repair',
  );
  progress.attempts.push(second);
  if (second.ok && problemOf(second) === null) {
    return {
      kind: 'repair_success',
      attempt: second,
    };
  }

  // Prefer the correction. Preserve valid operations from the first parse
  // when the correction cannot be parsed.
  const partial = second.ok ? second : first.ok ? first : null;
  if (partial && partial.validation.operations.length > 0) {
    return { kind: 'salvaged', attempt: partial };
  }

  const finalNote = problemOf(second, true) ?? '';
  try {
    const third = await runPlanningAttempt(
      context,
      [
        { message: first.message, note: firstProblem },
        { message: second.message, note: finalNote },
      ],
      'fallback',
    );
    progress.attempts.push(third);

    // Ignore a proposal even if the model invents one without the tool.
    if (third.ok && third.modelResponse.type !== 'proposal') {
      return {
        kind: 'fallback_answer',
        attempt: third,
      };
    }
  } catch (error) {
    // A parsed earlier response permits a fixed reply if explanation fails.
    if (!partial) {
      throw error;
    }
  }

  const lastParsed = progress.attempts
    .filter((candidate): candidate is ParsedPlanningAttempt => candidate.ok)
    .at(-1);
  if (lastParsed) {
    return {
      kind: 'empty_proposal',
      attempt: lastParsed,
    };
  }
  return {
    kind: 'unparseable',
    attempt: progress.attempts.at(-1) ?? first,
  };
}

function recordPlanningQuality(
  progress: PlanningProgress,
  outcome: PlanningOutcome | null,
  record: AiOrderingRunRecord,
  problemOf: ProblemOf,
): void {
  record.quality.repairAttempted = progress.repairStarted;
  if (!outcome) return;

  const settled =
    outcome.kind === 'empty_proposal' || outcome.kind === 'unparseable'
      ? null
      : outcome.attempt;
  if (progress.repairStarted) {
    record.quality.repairSucceeded =
      settled !== null && problemOf(settled) === null;
  }

  record.quality.ownershipViolationCount = progress.attempts
    .filter((candidate): candidate is ParsedPlanningAttempt => candidate.ok)
    .reduce(
      (total, candidate) =>
        total + candidate.validation.ownershipViolationCount,
      0,
    );

  const used = outcome.kind === 'empty_proposal' ? outcome.attempt : settled;
  record.quality.droppedOperationCount =
    used?.validation.rejections.length ?? 0;
}

function settlePlanningOutcome(
  outcome: PlanningOutcome,
  input: AiOrderingAgentInput,
  record: AiOrderingRunRecord,
): AIMessage {
  if (outcome.kind === 'unparseable') {
    record.modelOutput = outcome.attempt.modelOutput;
    record.rejectionDetail = outcome.attempt.ok
      ? 'unusable model output'
      : outcome.attempt.detail;
    return new AIMessage({ content: '' });
  }

  if (outcome.kind === 'empty_proposal') {
    // Earlier invalid changes are retained for review, but never shown.
    const reply = resolveAiOrderingEmptyProposalReply(
      input.guestMessage,
      input.locale,
    );
    record.modelOutput = outcome.attempt.modelOutput;
    record.response = { type: 'message', reply };
    return new AIMessage({ content: reply });
  }

  const { modelOutput, modelResponse, validation } = outcome.attempt;
  record.modelOutput = modelOutput;

  const hydrationContext = {
    confirmationRequired: input.confirmationRequired,
    newId: input.newId,
    label: {
      menu: input.validation.menu,
      cart: input.validation.cart,
      locale: input.locale,
    },
  };

  if (modelResponse.type !== 'proposal') {
    record.response = hydrateAiOrderingResponse(
      modelResponse,
      hydrationContext,
    );
    // Output-channel tools stop here; none reaches a tool node.
    return new AIMessage({ content: modelResponse.reply });
  }

  const hydrated = hydrateAiOrderingResponse(
    { ...modelResponse, operations: validation.operations },
    hydrationContext,
  );
  record.response = hydrated;

  // The HITL interrupt and cart executor both see backend-issued ids.
  return new AIMessage({
    content: '',
    tool_calls: [
      {
        id: hydrated.type === 'proposal' ? hydrated.proposalId : 'proposal',
        name: AI_ORDERING_PROPOSAL_TOOL,
        args: hydrated as unknown as Record<string, unknown>,
      },
    ],
  });
}

export function createAiOrderingPlanningMiddleware(
  input: AiOrderingAgentInput,
  record: AiOrderingRunRecord,
) {
  // Built from the same menu and cart the prompt was, so it reads the codes the
  // model was shown. Everything past the gate works on real ids.
  const idCodec = buildAiOrderingIdCodec(
    collectAiOrderingContextIds(input.validation.menu, input.validation.cart),
  );

  const callSignal = () =>
    AbortSignal.timeout(
      nextAiOrderingCallTimeoutMs(input.config, input.deadlineAt),
    );

  const planningMiddleware = createMiddleware({
    name: 'AiOrderingPlanning',
    wrapModelCall: async (request, handler) => {
      const providerContext = { request, handler, record, callSignal };
      if (record.phase === 'closing') {
        return runClosingModelCall(providerContext);
      }

      const planningContext: PlanningCallContext = {
        ...providerContext,
        input,
        idCodec,
      };

      const problemOf = (candidate: PlanningAttempt, final = false) =>
        candidate.ok
          ? describeProblem(
              {
                // Validation speaks in real ids; the model only ever saw codes.
                rejections: candidate.validation.rejections.map(
                  (rejection) => ({
                    ...rejection,
                    detail: idCodec.encodeText(rejection.detail),
                  }),
                ),
              },
              final,
            )
          : describeProblem(
              { gateDetail: candidate.detail, rejections: [] },
              final,
            );

      const progress: PlanningProgress = { attempts: [], repairStarted: false };
      let outcome: PlanningOutcome | null = null;
      try {
        outcome = await runPlanningRepairPolicy(
          planningContext,
          problemOf,
          progress,
        );
        return settlePlanningOutcome(outcome, input, record);
      } finally {
        recordPlanningQuality(progress, outcome, record, problemOf);
      }
    },
  });

  return planningMiddleware;
}
