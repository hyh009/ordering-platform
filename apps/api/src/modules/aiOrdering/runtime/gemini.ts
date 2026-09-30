import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { aiOrderingModelResponseSchema } from '@src/modules/aiOrdering/modelResponse';
import { toAiOrderingProviderMessages } from '@src/modules/aiOrdering/runtime/messages';

import type { BaseMessage } from '@langchain/core/messages';
import type {
  AiOrderingModelCall,
  AiOrderingModelCaller,
} from '@src/modules/aiOrdering/planner';
import type { AiOrderingSummaryCaller } from '@src/modules/aiOrdering/summary';
import type { AiOrderingVersionConfig } from '@src/modules/aiOrdering/types';

export type AiOrderingProviderUsage = {
  /**
   * Prompt tokens the provider served from its cache. The measure of whether
   * the volatility-ordered prompt layout is actually earning its keep.
   */
  cacheReadTokens: number;
  inputTokens: number;
  outputTokens: number;
};

export type AiOrderingStructuredModelResult = {
  /** The parsed structured output, or undefined when the provider's own parse failed. */
  parsed?: unknown;
  /** The underlying message, carrying usage metadata. */
  raw?: unknown;
};

/**
 * The narrow slice of the provider this module depends on.
 *
 * Declared here rather than importing LangChain's types so tests can supply a
 * plain object and never touch the network.
 */
export type AiOrderingStructuredModel = {
  invoke(
    messages: BaseMessage[],
    options?: { signal?: AbortSignal },
  ): Promise<AiOrderingStructuredModelResult>;
};

export type AiOrderingModelSession = {
  callModel: AiOrderingModelCaller;
  /** Usage summed across every call this session made, including any repair. */
  getUsage(): AiOrderingProviderUsage;
};

function readUsage(raw: unknown): Partial<AiOrderingProviderUsage> {
  if (typeof raw !== 'object' || raw === null) {
    return {};
  }

  const usage = (
    raw as {
      usage_metadata?: {
        input_tokens?: unknown;
        output_tokens?: unknown;
        input_token_details?: { cache_read?: unknown };
      };
    }
  ).usage_metadata;

  if (!usage) {
    return {};
  }

  const cacheRead = usage.input_token_details?.cache_read;

  return {
    ...(typeof usage.input_tokens === 'number'
      ? { inputTokens: usage.input_tokens }
      : {}),
    ...(typeof usage.output_tokens === 'number'
      ? { outputTokens: usage.output_tokens }
      : {}),
    ...(typeof cacheRead === 'number' ? { cacheReadTokens: cacheRead } : {}),
  };
}

/**
 * Builds a per-turn session around a structured model.
 *
 * Usage is accumulated on the session rather than returned from each call
 * because the planner may call the model twice and the caller contract hands
 * back only the model's answer. Summing here keeps the planner's contract
 * untouched and gets the repair attempt counted, which a per-call return value
 * would have made the caller re-add by hand.
 *
 * One session per turn. Reusing one across turns would silently pool their
 * token counts.
 */
/**
 * The budget for the next provider call.
 *
 * Whichever is smaller: this version's per-call timeout, or what is left of the
 * turn's overall budget. Without the second half, a turn's last call could start
 * with 2 seconds left and still run for 20, pushing the turn past the deadline
 * the in-flight lock's expiry was chosen against.
 */
function nextCallTimeoutMs(
  config: AiOrderingVersionConfig,
  deadlineAt: number | undefined,
): number {
  if (deadlineAt === undefined) {
    return config.timeoutMs;
  }

  return Math.max(0, Math.min(config.timeoutMs, deadlineAt - Date.now()));
}

export function createAiOrderingModelSession(input: {
  model: AiOrderingStructuredModel;
  config: AiOrderingVersionConfig;
  /** Epoch milliseconds the whole turn must finish by. */
  deadlineAt?: number;
}): AiOrderingModelSession {
  const usage: AiOrderingProviderUsage = {
    cacheReadTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
  };

  const callModel: AiOrderingModelCaller = async (
    call: AiOrderingModelCall,
  ) => {
    const result = await input.model.invoke(
      toAiOrderingProviderMessages(call),
      {
        signal: AbortSignal.timeout(
          nextCallTimeoutMs(input.config, input.deadlineAt),
        ),
      },
    );

    const observed = readUsage(result.raw);

    usage.cacheReadTokens += observed.cacheReadTokens ?? 0;
    usage.inputTokens += observed.inputTokens ?? 0;
    usage.outputTokens += observed.outputTokens ?? 0;

    // When the provider's own parse failed there is still an answer worth
    // gating: handing the raw content on lets the output gate reject it as
    // malformed, which is a far more useful outcome than a provider error.
    return result.parsed ?? result.raw;
  };

  return { callModel, getUsage: () => ({ ...usage }) };
}

/**
 * Builds the real Gemini-backed structured model.
 *
 * All provider access goes through LangChain rather than the Google SDK, so a
 * later version can compare providers without rewriting this module.
 *
 * `includeRaw` is on because the parsed object alone discards `usage_metadata`,
 * and the cache-read count is the only evidence that prompt ordering is working.
 */
/**
 * A plain-text call, for work that is not one of the four response types.
 *
 * Summarisation cannot go through the structured model: that model is bound to
 * the response union, so asking it for prose would force the summary into a
 * `message` shape and back out again.
 */
export type AiOrderingTextModel = {
  invoke(
    messages: BaseMessage[],
    options?: { signal?: AbortSignal },
  ): Promise<{ content: unknown }>;
};

function extractText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  // LangChain may return content as an array of typed blocks.
  if (Array.isArray(content)) {
    return content
      .map((block) =>
        typeof block === 'object' &&
        block !== null &&
        typeof (block as { text?: unknown }).text === 'string'
          ? (block as { text: string }).text
          : '',
      )
      .join('');
  }

  return '';
}

export function createAiOrderingSummaryCaller(input: {
  model: AiOrderingTextModel;
  config: AiOrderingVersionConfig;
  deadlineAt?: number;
}): AiOrderingSummaryCaller {
  return async ({ instructions, transcript }) => {
    const result = await input.model.invoke(
      [new SystemMessage(instructions), new HumanMessage(transcript)],
      {
        signal: AbortSignal.timeout(
          nextCallTimeoutMs(input.config, input.deadlineAt),
        ),
      },
    );

    return extractText(result.content);
  };
}

export function createGeminiTextModel(input: {
  apiKey: string;
  model: string;
}): AiOrderingTextModel {
  const chat = new ChatGoogleGenerativeAI({
    apiKey: input.apiKey,
    model: input.model,
  });

  return {
    async invoke(messages, options) {
      const result = await chat.invoke(messages, options);

      return { content: result.content };
    },
  };
}

export function createGeminiStructuredModel(input: {
  apiKey: string;
  model: string;
}): AiOrderingStructuredModel {
  const chat = new ChatGoogleGenerativeAI({
    apiKey: input.apiKey,
    model: input.model,
  });

  const structured = chat.withStructuredOutput(aiOrderingModelResponseSchema, {
    includeRaw: true,
  });

  return {
    async invoke(messages, options) {
      const result = await structured.invoke(messages, options);

      return result as AiOrderingStructuredModelResult;
    },
  };
}
