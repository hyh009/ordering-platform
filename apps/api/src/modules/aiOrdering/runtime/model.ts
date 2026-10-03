/**
 * Everything about calling the assistant's model that does not depend on WHICH
 * provider is behind it.
 *
 * LangChain unifies the INTERFACE — `invoke`, `bindTools`, message types, and the
 * normalised `usage_metadata` this file reads — but not the CONSTRUCTION: picking
 * a provider always means a package and a constructor. That part is the only part
 * that lives in a provider file (`gemini.ts`), and it is small on purpose.
 *
 * Adding a provider should mean one new file and one line in `index.ts`.
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';

import type { BaseMessage } from '@langchain/core/messages';
import type { AiOrderingSummaryCaller } from '@src/modules/aiOrdering/summary';
import type { AiOrderingToolCall } from '@src/modules/aiOrdering/tools';
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

export type AiOrderingToolCallingModelResult = {
  /** The tools the model called. Empty when it answered in plain text. */
  toolCalls: AiOrderingToolCall[];
  /** Free text the model returned alongside, or instead of, a tool call. */
  text: string;
  /** The underlying message, carrying usage metadata. */
  raw?: unknown;
};

/**
 * The narrow slice of the provider this module depends on.
 *
 * Declared here rather than importing LangChain's types so tests can supply a
 * plain object and never touch the network.
 */
export type AiOrderingToolCallingModel = {
  invoke(
    messages: BaseMessage[],
    options?: { signal?: AbortSignal },
  ): Promise<AiOrderingToolCallingModelResult>;
};

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
/**
 * How long the NEXT provider call may take.
 *
 * Clamped to what is left of the turn's budget, not just the per-call timeout:
 * a repair that starts with 200ms left must not be given the full timeout, or
 * the turn's duration stops being a guarantee.
 */
export function nextAiOrderingCallTimeoutMs(
  config: AiOrderingVersionConfig,
  deadlineAt: number | undefined,
): number {
  if (deadlineAt === undefined) {
    return config.timeoutMs;
  }

  return Math.max(0, Math.min(config.timeoutMs, deadlineAt - Date.now()));
}

/**
 * A plain-text call, for work that is not one of the four response types.
 *
 * Summarisation gets its own model rather than reusing the assistant's: that one
 * has the tools bound, and a summary is not one of the things those tools say.
 */
export type AiOrderingTextModel = {
  invoke(
    messages: BaseMessage[],
    options?: { signal?: AbortSignal },
  ): Promise<{ content: unknown }>;
};

/** Shared with the provider adapters, which face the same content shape. */
export function extractText(content: unknown): string {
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
          nextAiOrderingCallTimeoutMs(input.config, input.deadlineAt),
        ),
      },
    );

    return extractText(result.content);
  };
}
