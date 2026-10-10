import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import { env } from '@src/config/env';

import type { AIMessage, BaseMessage } from '@langchain/core/messages';

/**
 * One model call exactly as it crossed the provider boundary: what was sent,
 * which tools were bound, and what came back or why nothing did.
 */
export type AiOrderingModelCallTrace = {
  /** 1-based within the turn, so a repair reads as call 2 and 3. */
  callNumber: number;
  messages: BaseMessage[];
  toolNames: string[];
  output?: AIMessage;
  error?: unknown;
};

export type AiOrderingModelCallObserver = (
  trace: AiOrderingModelCallTrace,
) => void;

/**
 * Text only. A provider may return content as a list of parts that repeats the
 * tool call in its own wire format; the call is printed once, from `tool_calls`.
 */
function renderContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return JSON.stringify(content, null, 2);
  }

  return content
    .map((part: unknown) =>
      typeof part === 'string'
        ? part
        : typeof (part as { text?: unknown }).text === 'string'
          ? (part as { text: string }).text
          : '',
    )
    .filter((text) => text.length > 0)
    .join('\n');
}

function renderToolCalls(message: BaseMessage): string[] {
  const toolCalls =
    (message as { tool_calls?: { name: string; args: unknown }[] })
      .tool_calls ?? [];

  return toolCalls.map(
    (call) => `tool call: ${call.name}\n${JSON.stringify(call.args, null, 2)}`,
  );
}

function renderMessage(message: BaseMessage): string {
  const type = message.getType();
  const status = (message as { status?: string }).status;
  const name = type === 'tool' && message.name ? ` ${message.name}` : '';
  const heading = `---- [${type}${status === 'error' ? ' error' : ''}]${name}`;

  return [heading, renderContent(message.content), ...renderToolCalls(message)]
    .filter((part) => part.length > 0)
    .join('\n');
}

export function renderAiOrderingModelCallTrace(
  trace: AiOrderingModelCallTrace,
): string {
  const answer =
    trace.output !== undefined
      ? renderMessage(trace.output)
      : `FAILED: ${trace.error instanceof Error ? trace.error.message : String(trace.error)}`;

  return [
    `######## model call ${String(trace.callNumber)} — tools bound: ${trace.toolNames.join(', ') || '(none)'}`,
    ...trace.messages.map(renderMessage),
    '======== model answered',
    answer,
    '',
    '',
  ].join('\n');
}

/**
 * Writes every model call of one turn to a text file, when
 * `AI_ORDERING_DEBUG_DIR` is set. Returns `undefined` otherwise, so the agent
 * does no extra work in the normal case.
 *
 * A development aid only. The file holds the guest's own words and the whole
 * menu in plain text, which is why this is off unless a directory is named, and
 * why it must stay unset anywhere real guests are served.
 *
 * Ids appear as the short codes the model reads and writes, not as stored ids:
 * the point is to see what the model saw.
 */
export function createAiOrderingDebugTrace(
  label: string,
): AiOrderingModelCallObserver | undefined {
  const directory = env.AI_ORDERING_DEBUG_DIR;

  if (!directory) {
    return undefined;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(
    directory,
    `${stamp}-${label.replace(/[^\w-]/g, '_')}.txt`,
  );

  return (trace) => {
    // Never let a debugging aid fail the guest's turn.
    try {
      mkdirSync(directory, { recursive: true });
      appendFileSync(file, renderAiOrderingModelCallTrace(trace));
    } catch {
      // Unwritable directory: the turn carries on without a trace.
    }
  };
}
