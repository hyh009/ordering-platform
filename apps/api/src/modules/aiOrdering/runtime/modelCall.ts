import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { inspectAiOrderingModelOutput } from '@src/modules/aiOrdering/outputGate';
import {
  buildAiOrderingIdCodec,
  decodeAiOrderingModelResponse,
} from '@src/modules/aiOrdering/shortCodes';
import {
  validateAiOrderingOperations,
  validateAiOrderingShownProducts,
} from '@src/modules/aiOrdering/validation';

import type { BaseMessage } from '@langchain/core/messages';
import type { AiOrderingModelCallRecord } from '@src/models/aiOrdering/model';
import type {
  AiOrderingAgentInput,
  AiOrderingRunRecord,
} from '@src/modules/aiOrdering/runtime/types';
import type { ModelRequest, WrapModelCallHandler } from 'langchain';

export const AI_ORDERING_PROPOSAL_TOOL = 'propose_cart_operations';

export type EarlierAttempt = { message: AIMessage; note: string };
export type PlanningStage = 'initial' | 'repair' | 'fallback';

export type ProviderCallContext = {
  request: ModelRequest;
  handler: WrapModelCallHandler;
  record: AiOrderingRunRecord;
  callSignal: () => AbortSignal;
};

export type PlanningCallContext = ProviderCallContext & {
  input: AiOrderingAgentInput;
  idCodec: ReturnType<typeof buildAiOrderingIdCodec>;
};

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

/**
 * What the model is asked for after an execution, and only then.
 *
 * It already said what it was ABOUT to do when it proposed. This call is for
 * what came of it, which is a different sentence — and the guest is reading
 * both, one under the other.
 *
 * The outcomes are given as data in the tool result; this says what to do with
 * them. `rejected (removed by the guest)` is worth naming out loud, because the
 * guest just did it and an assistant that does not mention it reads as not
 * having noticed.
 */
const CLOSING_NOTE = [
  'The changes you proposed have now been carried out. The result of each one is in the tool result above.',
  'Tell the guest what happened, in the language they wrote in. Keep it to one or two short sentences.',
  'Do not repeat the sentence you wrote when you proposed: they have already read it, directly above yours.',
  'Say what was actually done. Name anything the guest removed, and anything that failed together with the reason given.',
  'Never say that something was added, changed or removed when its result does not say so.',
  'You cannot change the cart again in this turn, so do not offer to change it now.',
  'Then offer the next step in one short clause: whether they would like anything else, or are ready to send the order. Do not explain how sending works unless they ask.',
].join('\n');

/**
 * An earlier attempt and what was wrong with it, as the model is shown it.
 *
 * Where the attempt called a tool, the problem goes back as that call's
 * ERROR RESULT: the model sees the call it made and the tool refusing it,
 * which is the exchange it is trained to correct from. A note on its own
 * left the model retrying a call it could no longer see.
 */
const replayEarlier = (
  earlier: EarlierAttempt[],
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

export async function runClosingModelCall({
  request,
  handler,
  record,
  callSignal,
}: ProviderCallContext): Promise<AIMessage> {
  record.modelCalls += 1;

  const closing = await handler({
    ...request,
    tools: [],
    // Without this the model has no idea its job changed: it sees its own
    // conversation, a line of outcomes, and nothing asking for anything
    // new — so it repeats the sentence it wrote when it PROPOSED, word
    // for word, and the guest reads the same thing twice.
    //
    // Injected per call rather than written into the core instructions,
    // like the repair notes are. A decided run reaches this once; the
    // core block is the cached prefix of every turn, and a rule about one
    // call does not belong in it.
    messages: [...request.messages, new HumanMessage(CLOSING_NOTE)],
    modelSettings: { ...request.modelSettings, signal: callSignal() },
  });
  record.cacheReadTokens += readCacheReadTokens(closing);

  return closing;
}

export async function runPlanningAttempt(
  { request, handler, input, record, idCodec, callSignal }: PlanningCallContext,
  earlier: EarlierAttempt[],
  stage: PlanningStage,
) {
  const canPropose = stage !== 'fallback';
  record.modelCalls += 1;

  const callRequest = {
    ...request,
    // Each call is clamped to what is left of the turn's budget, so a
    // repair that starts late cannot run past it on a fresh timeout.
    modelSettings: { ...request.modelSettings, signal: callSignal() },
    ...(canPropose
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
          // attempt established is left intact. The fallback call gets
          // plain notes: its proposal tool is unbound, and a provider may
          // refuse a history that calls a tool it was not given.
          messages: [
            ...request.messages,
            ...replayEarlier(earlier, canPropose),
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
    callRecord.error = error instanceof Error ? error.message : String(error);
    input.onModelCall?.({ ...trace, error });
    throw error;
  }

  const modelOutput = toModelOutput(message);
  callRecord.output = modelOutput;
  input.onModelCall?.({ ...trace, output: message });

  record.cacheReadTokens += readCacheReadTokens(message);

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
}

export type PlanningAttempt = Awaited<ReturnType<typeof runPlanningAttempt>>;
export type ParsedPlanningAttempt = Extract<PlanningAttempt, { ok: true }>;
