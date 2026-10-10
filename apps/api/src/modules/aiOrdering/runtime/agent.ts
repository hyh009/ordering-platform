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
 * bounded repair attempts, and which tool calls may ever reach a tool node.
 */

import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { executeAiOrderingOperations } from '@src/modules/aiOrdering/cartExecution';
import { resolveAiOrderingEmptyProposalReply } from '@src/modules/aiOrdering/emptyProposalReply';
import { hydrateAiOrderingResponse } from '@src/modules/aiOrdering/modelResponse';
import { inspectAiOrderingModelOutput } from '@src/modules/aiOrdering/outputGate';
import { nextAiOrderingCallTimeoutMs } from '@src/modules/aiOrdering/runtime/model';
import {
  buildAiOrderingIdCodec,
  collectAiOrderingContextIds,
  decodeAiOrderingModelResponse,
} from '@src/modules/aiOrdering/shortCodes';
import { aiOrderingToolDefinitions } from '@src/modules/aiOrdering/tools';
import {
  validateAiOrderingOperations,
  validateAiOrderingShownProducts,
} from '@src/modules/aiOrdering/validation';
import {
  createAgent,
  createMiddleware,
  humanInTheLoopMiddleware,
} from 'langchain';

import type { BaseMessage } from '@langchain/core/messages';
import type { BaseCheckpointSaver } from '@langchain/langgraph';
import type {
  AiOrderingOperation,
  AiOrderingOperationResult,
  AiOrderingResponse,
  SupportedLocale,
} from '@repo/shared';
import type {
  AiOrderingModelCallRecord,
  AiOrderingTurnQualitySignals,
} from '@src/models/aiOrdering/model';
import type { AiOrderingCartExecutor } from '@src/modules/aiOrdering/cartExecution';
import type { AiOrderingModelCallObserver } from '@src/modules/aiOrdering/runtime/debugTrace';
import type {
  AiOrderingAssembledContext,
  AiOrderingVersionConfig,
} from '@src/modules/aiOrdering/types';
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
  /** What each of those calls was given and returned, in order, for review. */
  calls: AiOrderingModelCallRecord[];
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
    calls: [],
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
  /** The locale the per-operation labels are written in. */
  locale: SupportedLocale;
  /** What the guest typed this turn. Only read to pick a fallback language. */
  guestMessage: string;
  /** Applied to each tool's argument schema; the provider decides its dialect. */
  toToolSchema: (schema: unknown) => Record<string, unknown>;
  model: unknown;
  checkpointer: BaseCheckpointSaver;
  executor: AiOrderingCartExecutor;
  /**
   * The operations the guest removed from the proposal before accepting it.
   *
   * Reported by the proposal tool and never executed. The resume rewrites the
   * pending call to the kept operations only, so without this the model sees a
   * proposal of one operation where it made two, and cannot mention the row the
   * guest took out — the outcome inferred from absence that
   * `AiOrderingProposalDecision.results` already refuses to allow anywhere else.
   *
   * Empty on a first run, where nothing has been decided yet.
   */
  dismissedOperationIds?: string[] | undefined;
  /** Epoch milliseconds the whole turn must finish by. */
  deadlineAt?: number | undefined;
  /** Shown every model call as it happens. A debugging aid; see `debugTrace.ts`. */
  onModelCall?: AiOrderingModelCallObserver | undefined;
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

  const hydrationContext = {
    confirmationRequired: input.confirmationRequired,
    newId: input.newId,
    // The same menu and cart validation ran against, so the label describes the
    // operation as it was checked.
    label: {
      menu: input.validation.menu,
      cart: input.validation.cart,
      locale: input.locale,
    },
  };

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

      /**
       * An earlier attempt and what was wrong with it, as the model is shown it.
       *
       * Where the attempt called a tool, the problem goes back as that call's
       * ERROR RESULT: the model sees the call it made and the tool refusing it,
       * which is the exchange it is trained to correct from. A note on its own
       * left the model retrying a call it could no longer see.
       */
      const replayEarlier = (
        earlier: { message: AIMessage; note: string }[],
        asToolResults: boolean,
      ): BaseMessage[] =>
        earlier.flatMap(({ message, note }): BaseMessage[] => {
          const toolCalls = asToolResults ? (message.tool_calls ?? []) : [];

          if (toolCalls.length === 0) {
            return [new HumanMessage(note)];
          }

          return [
            message,
            ...toolCalls.map(
              (call) =>
                new ToolMessage({
                  content: note,
                  tool_call_id: call.id ?? '',
                  name: call.name,
                  status: 'error',
                }),
            ),
          ];
        });

      const attempt = async (
        earlier: { message: AIMessage; note: string }[],
        options: { canPropose: boolean },
      ) => {
        record.modelCalls += 1;

        const callRequest = {
          ...request,
          // Each call is clamped to what is left of the turn's budget, so a
          // repair that starts late cannot run past it on a fresh timeout.
          modelSettings: { ...request.modelSettings, signal: callSignal() },
          ...(options.canPropose
            ? {}
            : {
                // Unbound rather than forbidden in prose: without the tool the
                // model can only talk to the guest, so this call cannot end in
                // another proposal that fails the same way.
                tools: request.tools.filter(
                  (candidate) =>
                    (candidate as { name?: unknown }).name !==
                    AI_ORDERING_PROPOSAL_TOOL,
                ),
              }),
          ...(earlier.length === 0
            ? {}
            : {
                // Appended LAST, and in order, so the cached prefix each earlier
                // attempt established is left intact. The closing call gets
                // plain notes: its proposal tool is unbound, and a provider may
                // refuse a history that calls a tool it was not given.
                messages: [
                  ...request.messages,
                  ...replayEarlier(earlier, options.canPropose),
                ],
              }),
        };

        const trace = {
          callNumber: record.modelCalls,
          messages: callRequest.messages as BaseMessage[],
          toolNames: callRequest.tools.map((candidate) =>
            String((candidate as { name?: unknown }).name),
          ),
        };

        // What the review surface keeps of this call. The prompt itself is not
        // repeated per call: only what was added for THIS call, which is the
        // feedback on the one before it.
        const feedback = earlier.at(-1)?.note;
        const callRecord: AiOrderingModelCallRecord = {
          toolNames: trace.toolNames,
          ...(feedback !== undefined ? { feedback } : {}),
        };

        record.calls.push(callRecord);

        let message: AIMessage;

        try {
          message = (await handler(callRequest)) as AIMessage;
        } catch (error) {
          callRecord.error =
            error instanceof Error ? error.message : String(error);
          input.onModelCall?.({ ...trace, error });
          throw error;
        }

        callRecord.output = toModelOutput(message);
        input.onModelCall?.({ ...trace, output: message });

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

        const modelResponse = decodeAiOrderingModelResponse(
          gate.modelResponse,
          idCodec,
        );

        const validation = validateAiOrderingOperations(
          modelResponse,
          input.validation,
        );

        return {
          ok: true as const,
          message,
          modelOutput,
          modelResponse,
          validation: {
            ...validation,
            // A shown set is checked against the same menu, and its rejections
            // join the others so one repair path handles every kind. Unlike an
            // operation, none of it survives partially: the set stands whole or
            // the model is asked again.
            rejections: [
              ...validation.rejections,
              ...validateAiOrderingShownProducts(
                modelResponse,
                input.validation.menu,
              ),
            ],
          },
        };
      };

      type Attempt = Awaited<ReturnType<typeof attempt>>;
      type ParsedAttempt = Extract<Attempt, { ok: true }>;

      const isParsed = (candidate: Attempt): candidate is ParsedAttempt =>
        candidate.ok;

      const problemOf = (candidate: Attempt, final = false) =>
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

      // Three calls at most. The first two may propose; the third may only talk.
      const first = await attempt([], { canPropose: true });
      const attempts: Attempt[] = [first];
      const firstProblem = problemOf(first);

      // The attempt the guest's response is built from. Null means none is.
      let settled: ParsedAttempt | null =
        first.ok && firstProblem === null ? first : null;

      if (firstProblem !== null) {
        record.quality.repairAttempted = true;

        const second = await attempt(
          [{ message: first.message, note: firstProblem }],
          { canPropose: true },
        );
        attempts.push(second);

        if (second.ok && problemOf(second) === null) {
          settled = second;
        } else {
          // Prefer the correction, but do not throw away a usable first attempt
          // because the correction came back unparseable.
          const partial = second.ok ? second : first.ok ? first : null;

          if (partial && partial.validation.operations.length > 0) {
            // Some operations survived: drop the rest and propose what is left.
            settled = partial;
          } else {
            const finalNote = problemOf(second, true) ?? '';

            try {
              const third = await attempt(
                [
                  { message: first.message, note: firstProblem },
                  { message: second.message, note: finalNote },
                ],
                { canPropose: false },
              );
              attempts.push(third);

              // A proposal here was made without the tool, so it is ignored.
              if (third.ok && third.modelResponse.type !== 'proposal') {
                settled = third;
              }
            } catch (error) {
              // With an earlier attempt that parsed, a failed explanation costs
              // the guest a fixed line rather than the whole turn.
              if (!partial) {
                throw error;
              }
            }
          }
        }

        record.quality.repairSucceeded =
          settled !== null && problemOf(settled) === null;
      }

      record.quality.ownershipViolationCount = attempts
        .filter(isParsed)
        .reduce(
          (total, candidate) =>
            total + candidate.validation.ownershipViolationCount,
          0,
        );

      if (!settled) {
        const lastParsed = attempts.filter(isParsed).at(-1);

        if (!lastParsed) {
          const last = attempts.at(-1) ?? first;

          record.modelOutput = last.modelOutput;
          record.rejectionDetail = last.ok
            ? 'unusable model output'
            : last.detail;

          // No tool call and no content: the run ends with nothing to show, and
          // the caller surfaces an error. There is no text worth showing here.
          return new AIMessage({ content: '' });
        }

        // Every change was invalid and the model did not manage to say so. Its
        // earlier reply is NOT shown: it introduces changes that no longer
        // exist. It stays on the record as `modelOutput` for review.
        const reply = resolveAiOrderingEmptyProposalReply(
          input.guestMessage,
          input.locale,
        );

        record.modelOutput = lastParsed.modelOutput;
        record.quality.droppedOperationCount =
          lastParsed.validation.rejections.length;
        record.response = { type: 'message', reply };

        return new AIMessage({ content: reply });
      }

      record.modelOutput = settled.modelOutput;
      record.quality.droppedOperationCount =
        settled.validation.rejections.length;

      const { modelResponse, validation } = settled;

      if (modelResponse.type !== 'proposal') {
        record.response = hydrateAiOrderingResponse(
          modelResponse,
          hydrationContext,
        );

        // Returned WITHOUT tool calls, so the agent loop ends here. `ask_choices`
        // and `report_unanswerable` have nothing to execute, and letting them
        // reach a tool node would feed a result back and call the model again.
        return new AIMessage({ content: modelResponse.reply });
      }

      const hydrated = hydrateAiOrderingResponse(
        { ...modelResponse, operations: validation.operations },
        hydrationContext,
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
