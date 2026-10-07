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
import type { AiOrderingVersionConfig } from '@src/modules/aiOrdering/types';

/**
 * How long the NEXT provider call may take.
 *
 * Whichever is smaller: this version's per-call timeout, or what is left of the
 * turn's overall budget. Without the second half, a turn's last call could start
 * with 2 seconds left and still run for 20, pushing the turn past the deadline
 * the in-flight lock's expiry was chosen against — the turn's duration would
 * stop being a guarantee.
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

/**
 * LangChain content, flattened to a string.
 *
 * Module-private: the summary caller below is the only caller. A provider file
 * that needs the same flattening should export it again rather than reach for
 * it, so the shared surface says what is actually shared.
 */
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
          nextAiOrderingCallTimeoutMs(input.config, input.deadlineAt),
        ),
      },
    );

    return extractText(result.content);
  };
}
