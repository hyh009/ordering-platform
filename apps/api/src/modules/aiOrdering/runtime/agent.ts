/**
 * The assistant's agent run.
 *
 * One run per guest turn. It pauses when the model proposes cart changes and is
 * resumed by the guest's decision, which is what lets the backend execute the
 * accepted operations and record their outcome in the same request that causes
 * them — rather than waiting for the guest to speak again.
 *
 * LangChain's `createAgent` runs the loop. `planningMiddleware` owns the bounded
 * repair policy and which calls reach a tool node; `modelCall` owns the output
 * gate and validation for each planning attempt.
 */

import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { executeAiOrderingOperations } from '@src/modules/aiOrdering/cartExecution';
import { AI_ORDERING_PROPOSAL_TOOL } from '@src/modules/aiOrdering/runtime/modelCall';
import { createAiOrderingPlanningMiddleware } from '@src/modules/aiOrdering/runtime/planningMiddleware';
import { aiOrderingToolDefinitions } from '@src/modules/aiOrdering/tools';
import { createAgent, humanInTheLoopMiddleware } from 'langchain';

import type { AiOrderingOperation } from '@repo/shared';
import type {
  AiOrderingAgentInput,
  AiOrderingRunRecord,
} from '@src/modules/aiOrdering/runtime/types';

export { AI_ORDERING_PROPOSAL_TOOL } from '@src/modules/aiOrdering/runtime/modelCall';
export type {
  AiOrderingAgentInput,
  AiOrderingRunRecord,
} from '@src/modules/aiOrdering/runtime/types';

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
    calls: [],
    modelCalls: 0,
  };
}

export type AiOrderingAgent = {
  record: AiOrderingRunRecord;
  agent: ReturnType<typeof createAgent>;
  /** The messages the first model call is given, in cache-prefix order. */
  messages: HumanMessage[];
};

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

      // Every operation the proposal had, not only the ones that ran. The
      // dismissed ones were edited out of this call before it was resumed, so
      // this line is the model's only way to know the guest removed them.
      return [
        ...results.map(
          (result) =>
            `${result.operationId}: ${result.outcome}${
              result.failureCode ? ` (${result.failureCode})` : ''
            }`,
        ),
        ...(input.dismissedOperationIds ?? []).map(
          (operationId) => `${operationId}: rejected (removed by the guest)`,
        ),
      ].join('\n');
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

  const planningMiddleware = createAiOrderingPlanningMiddleware(input, record);

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
