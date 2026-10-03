/**
 * The assistant's agent run.
 *
 * One run per guest turn. It pauses when the model proposes cart changes and is
 * resumed by the guest's decision, which is what lets the backend execute the
 * accepted operations and record their outcome in the same request that causes
 * them — rather than waiting for the guest to speak again.
 *
 * The loop is LangChain's (`createAgent`), but the product decisions inside it
 * are ours and live in `planningMiddleware`: the output gate, validation, the
 * single repair retry, and which tool calls may ever reach a tool node.
 */

import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { executeAiOrderingOperations } from '@src/modules/aiOrdering/cartExecution';
import { hydrateAiOrderingResponse } from '@src/modules/aiOrdering/modelResponse';
import { inspectAiOrderingModelOutput } from '@src/modules/aiOrdering/outputGate';
import { nextAiOrderingCallTimeoutMs } from '@src/modules/aiOrdering/runtime/model';
import { aiOrderingToolDefinitions } from '@src/modules/aiOrdering/tools';
import { validateAiOrderingOperations } from '@src/modules/aiOrdering/validation';
import { createAgent, createMiddleware, humanInTheLoopMiddleware } from 'langchain';

import type { BaseCheckpointSaver } from '@langchain/langgraph';
import type { AiOrderingOperation, AiOrderingOperationResult, AiOrderingResponse } from '@repo/shared';
import type { AiOrderingTurnQualitySignals } from '@src/models/aiOrdering/model';
import type { AiOrderingCartExecutor } from '@src/modules/aiOrdering/cartExecution';
import type { AiOrderingAssembledContext, AiOrderingVersionConfig } from '@src/modules/aiOrdering/types';
import type { AiOrderingValidationInput } from '@src/modules/aiOrdering/validation';

export const AI_ORDERING_PROPOSAL_TOOL = 'propose_cart_operations';

/**
 * What the run produced, collected as it goes.
 *
 * A mutable object rather than agent state because the service owns it: the
 * response, the quality signals, and the execution results are all things the
 * service persists, and threading them back out through the graph's state would
 * only be a longer way to reach the same object.
 */
export type AiOrderingRunRecord = {
  /** `planning` until the proposal executes, `closing` for the reply after it. */
  phase: 'planning' | 'closing';
  /** The response the guest should see. Null when nothing usable was produced. */
  response: AiOrderingResponse | null;
  /** Raw model output of the attempt that was used, kept for the corpus. */
  modelOutput: unknown;
  /** Set when no attempt produced anything usable. */
  rejectionDetail: string | null;
  quality: AiOrderingTurnQualitySignals;
  /** Set once the proposal tool has run. */
  results: AiOrderingOperationResult[] | null;
  cacheReadTokens: number;
  /** Every model call this run made, including the repair and the closing one. */
  modelCalls: number;
};

function emptyRecord(): AiOrderingRunRecord {
  return {
    phase: 'planning',
    response: null,
    modelOutput: null,
    rejectionDetail: null,
    quality: {
      repairAttempted: false,
      droppedOperationCount: 0,
      ownershipViolationCount: 0,
    },
    results: null,
    cacheReadTokens: 0,
    modelCalls: 0,
  };
}

/** Reads the provider's cached-prompt count, which is the only evidence the
 * volatility-ordered prompt layout is earning its keep. */
function readCacheReadTokens(message: AIMessage): number {
  const usage = (
    message as unknown as {
      usage_metadata?: { input_token_details?: { cache_read?: number } };
    }
  ).usage_metadata;

  return usage?.input_token_details?.cache_read ?? 0;
}

function toModelOutput(message: AIMessage): {
  toolCalls: { name: string; args: unknown }[];
  text: string;
} {
  return {
    toolCalls: (message.tool_calls ?? []).map((call) => ({
      name: call.name,
      args: call.args,
    })),
    text: typeof message.content === 'string' ? message.content : '',
  };
}

export type AiOrderingAgentInput = {
  config: AiOrderingVersionConfig;
  context: AiOrderingAssembledContext;
  validation: AiOrderingValidationInput;
  confirmationRequired: boolean;
  newId: (prefix: string) => string;
  /** Applied to each tool's argument schema; the provider decides its dialect. */
  toToolSchema: (schema: unknown) => Record<string, unknown>;
  model: unknown;
  checkpointer: BaseCheckpointSaver;
  executor: AiOrderingCartExecutor;
  /** Epoch milliseconds the whole turn must finish by. */
  deadlineAt?: number | undefined;
};

export type AiOrderingAgent = {
  record: AiOrderingRunRecord;
  agent: ReturnType<typeof createAgent>;
  /** The messages the first model call is given, in cache-prefix order. */
  messages: HumanMessage[];
};

/**
 * Describes what was wrong with an attempt, in the model's own terms.
 *
 * Unchanged in substance from the hand-written loop it replaces: the model is
 * told which change failed and why, rather than being asked to try again blind.
 */
function describeProblem(input: {
  gateDetail?: string;
  rejections: { index: number; detail: string }[];
}): string | null {
  if (input.gateDetail !== undefined) {
    return `Your previous reply could not be used: ${input.gateDetail}. Reply again in the required format.`;
  }

  if (input.rejections.length === 0) {
    return null;
  }

  return [
    'Some of the changes you proposed cannot be applied:',
    ...input.rejections.map(
      (rejection) => `- change #${rejection.index + 1}: ${rejection.detail}`,
    ),
    'Reply again proposing only changes that are possible, or ask the guest a question instead.',
  ].join('\n');
}

export function createAiOrderingAgent(
  input: AiOrderingAgentInput,
): AiOrderingAgent {
  const record = emptyRecord();

  const messages = input.context.blocks.map(
    (block) => new HumanMessage(block.text),
  );

  /**
   * The proposal tool, which DOES execute — but only after the guest has
   * accepted it, because the human-in-the-loop middleware interrupts before this
   * body runs. The arguments it receives are the hydrated proposal, narrowed to
   * the operations the guest kept.
   */
  const proposalTool = tool(
    async (args: unknown) => {
      const operations = ((args as { operations?: AiOrderingOperation[] })
        .operations ?? []) as AiOrderingOperation[];

      const results = await executeAiOrderingOperations(
        operations,
        input.executor,
      );

      record.results = results;
      // Everything after this point is the model saying what happened. It never
      // proposes again inside a run that has already been decided.
      record.phase = 'closing';

      return results
        .map(
          (result) =>
            `${result.operationId}: ${result.outcome}${
              result.failureCode ? ` (${result.failureCode})` : ''
            }`,
        )
        .join('\n');
    },
    {
      name: AI_ORDERING_PROPOSAL_TOOL,
      description:
        aiOrderingToolDefinitions.find(
          (definition) => definition.name === AI_ORDERING_PROPOSAL_TOOL,
        )?.description ?? '',
      // The gate validates; this schema is the model's prompt, not our guard.
      schema: input.toToolSchema(
        aiOrderingToolDefinitions.find(
          (definition) => definition.name === AI_ORDERING_PROPOSAL_TOOL,
        )?.schema,
      ),
    },
  );

  /**
   * The output-channel tools. Nothing executes: the middleware turns them into
   * the turn's answer and ends the run, so they never reach a tool node.
   */
  const answerTools = aiOrderingToolDefinitions
    .filter((definition) => definition.name !== AI_ORDERING_PROPOSAL_TOOL)
    .map((definition) =>
      tool(async () => '', {
        name: definition.name,
        description: definition.description,
        schema: input.toToolSchema(definition.schema),
      }),
    );

  const callSignal = () =>
    AbortSignal.timeout(
      nextAiOrderingCallTimeoutMs(input.config, input.deadlineAt),
    );

  const planningMiddleware = createMiddleware({
    name: 'AiOrderingPlanning',
    wrapModelCall: async (request, handler) => {
      // The closing call after an execution. No tools: the cart has already
      // changed, and a second proposal inside a decided run is exactly what
      // single use forbids. Unbinding makes it unrepresentable, not policed.
      if (record.phase === 'closing') {
        record.modelCalls += 1;

        const closing = await handler({
          ...request,
          tools: [],
          modelSettings: { ...request.modelSettings, signal: callSignal() },
        });
        record.cacheReadTokens += readCacheReadTokens(closing);

        return closing;
      }

      const attempt = async (repairNote?: string) => {
        record.modelCalls += 1;

        const message = await handler({
          ...request,
          // Each call is clamped to what is left of the turn's budget, so a
          // repair that starts late cannot run past it on a fresh timeout.
          modelSettings: { ...request.modelSettings, signal: callSignal() },
          ...(repairNote === undefined
            ? {}
            : {
                // Appended LAST so the cached prefix the first attempt
                // established is left intact.
                messages: [...request.messages, new HumanMessage(repairNote)],
              }),
        });

        record.cacheReadTokens += readCacheReadTokens(message);

        const modelOutput = toModelOutput(message);
        const gate = inspectAiOrderingModelOutput(modelOutput, input.config);

        if (!gate.ok) {
          return {
            ok: false as const,
            message,
            modelOutput,
            detail: gate.rejection.detail,
          };
        }

        return {
          ok: true as const,
          message,
          modelOutput,
          modelResponse: gate.modelResponse,
          validation: validateAiOrderingOperations(
            gate.modelResponse,
            input.validation,
          ),
        };
      };

      const first = await attempt();
      const firstProblem = first.ok
        ? describeProblem({ rejections: first.validation.rejections })
        : describeProblem({ gateDetail: first.detail, rejections: [] });

      let final = first;

      if (firstProblem !== null) {
        record.quality.repairAttempted = true;
        final = await attempt(firstProblem);
        record.quality.repairSucceeded = final.ok
          ? describeProblem({ rejections: final.validation.rejections }) === null
          : false;
      }

      record.quality.ownershipViolationCount =
        (first.ok ? first.validation.ownershipViolationCount : 0) +
        (record.quality.repairAttempted && final.ok
          ? final.validation.ownershipViolationCount
          : 0);

      // Prefer the correction, but do not throw away a usable first attempt
      // because the correction came back unparseable.
      const usable = final.ok ? final : first.ok ? first : null;

      if (!usable) {
        record.modelOutput = final.modelOutput;
        record.rejectionDetail = final.ok ? 'unusable model output' : final.detail;

        // No tool call and no content: the run ends with nothing to show, and
        // the caller surfaces an error. There is no text worth showing here.
        return new AIMessage({ content: '' });
      }

      record.modelOutput = usable.modelOutput;
      record.quality.droppedOperationCount = usable.validation.rejections.length;

      const { modelResponse, validation } = usable;

      if (
        modelResponse.type !== 'proposal' ||
        validation.operations.length === 0
      ) {
        // Nothing survived validation, so there is no proposal — but the model's
        // own reply is still the right thing to say, in the right language.
        record.response =
          modelResponse.type === 'proposal'
            ? { type: 'message', reply: modelResponse.reply }
            : hydrateAiOrderingResponse(modelResponse, {
                confirmationRequired: input.confirmationRequired,
                newId: input.newId,
              });

        // Returned WITHOUT tool calls, so the agent loop ends here. `ask_choice`
        // and `report_unanswerable` have nothing to execute, and letting them
        // reach a tool node would feed a result back and call the model again.
        return new AIMessage({ content: modelResponse.reply });
      }

      const hydrated = hydrateAiOrderingResponse(
        { ...modelResponse, operations: validation.operations },
        {
          confirmationRequired: input.confirmationRequired,
          newId: input.newId,
        },
      );

      record.response = hydrated;

      // The tool call is rewritten to the HYDRATED proposal. The model is not
      // allowed to emit ids, but the execution and the guest's edit both work on
      // them, so the interrupt, the client, and the tool all read one set of
      // backend-issued ids.
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
    },
  });

  const agent = createAgent({
    model: input.model as never,
    tools: [proposalTool, ...answerTools],
    // Order matters: `afterModel` hooks run last to first, so the planning
    // middleware is listed AFTER the interrupt so that gating and validation
    // decide before anything can become an interrupt.
    middleware: [
      // `true` means approve, edit, and reject are all allowed — edit being the
      // one that matters, since dismissing some operations is an edit of this
      // call's arguments rather than a separate decision per operation.
      //
      // The cast is a type-interop defect, not uncertainty about the shape:
      // `HumanInTheLoopMiddlewareConfig` resolves to `never` because this
      // package's `zod/v3` types and `@langchain/core`'s do not unify under the
      // installed versions. The runtime shape is pinned by the interrupt tests.
      humanInTheLoopMiddleware({
        interruptOn: { [AI_ORDERING_PROPOSAL_TOOL]: true },
      } as never),
      planningMiddleware,
    ] as never,
    checkpointer: input.checkpointer,
  });

  return { record, agent, messages };
}
