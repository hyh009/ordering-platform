import { aiOrderingModelArgumentSchemas } from '@src/modules/aiOrdering/modelResponse';

import type { AiOrderingModelResponse } from '@src/modules/aiOrdering/modelResponse';
import type { z } from 'zod';

/**
 * The assistant's tools — the model's OUTPUT channel, not an action channel.
 *
 * Nothing here executes. A tool call IS the turn's final answer: the arguments
 * are gated, validated, hydrated, and handed to the frontend, and the turn ends.
 * No result is ever fed back for the model to continue reasoning from, so a
 * turn makes more than one model call only to repair an unusable answer.
 *
 * Only three tools, because the fourth answer — a plain reply — is what the model
 * produces by NOT calling a tool. Binding a `reply` tool would add a way to get
 * that wrong for no gain.
 *
 * Menu retrieval is deliberately absent. The menu is assembled into the prompt;
 * see design decision 2 for why retrieval tools are a separate, later version
 * rather than an extension of this set.
 */
export type AiOrderingToolDefinition = {
  name: string;
  description: string;
  /**
   * The response type this tool stands for. The tool NAME is the discriminator,
   * so the model never supplies `type` itself.
   */
  responseType: Exclude<AiOrderingModelResponse['type'], 'message'>;
  schema: z.ZodType;
};

export const aiOrderingToolDefinitions: readonly AiOrderingToolDefinition[] = [
  {
    name: 'propose_cart_operations',
    responseType: 'proposal',
    description:
      "Propose changes to the guest's cart. The guest reviews the proposal and accepts, edits, or dismisses it, so nothing is applied by calling this. Call it once with every change you are proposing.",
    schema: aiOrderingModelArgumentSchemas.proposal,
  },
  {
    name: 'ask_choice',
    responseType: 'choices',
    description:
      'Ask the guest one question and offer a short list of options to pick from. Use it when a required choice cannot be determined from what they said. They may also answer by typing instead of picking.',
    schema: aiOrderingModelArgumentSchemas.choices,
  },
  {
    name: 'report_unanswerable',
    responseType: 'unanswered',
    description:
      'State that you cannot answer the question, with the reason. Use it when the data you were given does not contain the answer, instead of guessing.',
    schema: aiOrderingModelArgumentSchemas.unanswered,
  },
];

export type AiOrderingToolCall = {
  name: string;
  args: unknown;
};

/**
 * One reply from the provider, reduced to the two things that can carry an
 * answer.
 *
 * Declared here rather than in the runtime because the output gate reads it and
 * must not depend on the provider module.
 */
export type AiOrderingModelReply = {
  toolCalls: AiOrderingToolCall[];
  /** Free text the model returned alongside, or instead of, a tool call. */
  text: string;
};

export type AiOrderingToolAnswer =
  | {
      ok: true;
      /** `{ type, ...args }`, still unvalidated: the gate parses it. */
      candidate: unknown;
    }
  | {
      ok: false;
      code: 'no_tool_call' | 'ambiguous_tool_call';
      detail: string;
    };

/**
 * Narrows provider output to a reply, or `null` when it is not one at all.
 *
 * `null` means a defect on our side of the boundary rather than a model mistake:
 * the runtime always produces both fields.
 */
export function readAiOrderingModelReply(
  output: unknown,
): AiOrderingModelReply | null {
  if (typeof output !== 'object' || output === null) {
    return null;
  }

  const { toolCalls, text } = output as {
    toolCalls?: unknown;
    text?: unknown;
  };

  if (!Array.isArray(toolCalls) || typeof text !== 'string') {
    return null;
  }

  return {
    toolCalls: toolCalls.map((call) => {
      const { name, args } = (call ?? {}) as { name?: unknown; args?: unknown };

      return { name: typeof name === 'string' ? name : '', args };
    }),
    text,
  };
}

/**
 * Reads the turn's answer out of a reply, mapping tool name to response type.
 *
 * A bound tool is a request, not a guarantee — unlike a response schema, nothing
 * forces the model to call one. So "no tool and no text" and "two tools at once"
 * are both real outcomes that get their own reason, rather than being reported as
 * malformed arguments.
 */
export function readAiOrderingToolAnswer(
  reply: AiOrderingModelReply,
): AiOrderingToolAnswer {
  if (reply.toolCalls.length > 1) {
    return {
      ok: false,
      code: 'ambiguous_tool_call',
      detail: `called ${reply.toolCalls.length} tools at once (${reply.toolCalls
        .map((call) => call.name || '(unnamed)')
        .join(', ')}); a turn has exactly one answer`,
    };
  }

  const [toolCall] = reply.toolCalls;

  if (!toolCall) {
    // Not calling a tool is how the model answers in plain text — but only when
    // there is text. Neither one means it said nothing at all.
    if (reply.text.trim().length === 0) {
      return {
        ok: false,
        code: 'no_tool_call',
        detail: 'called no tool and returned no text',
      };
    }

    return { ok: true, candidate: { type: 'message', reply: reply.text } };
  }

  const definition = aiOrderingToolDefinitions.find(
    (candidate) => candidate.name === toolCall.name,
  );

  if (!definition) {
    return {
      ok: false,
      code: 'no_tool_call',
      detail: `called an unknown tool ${toolCall.name || '(unnamed)'}`,
    };
  }

  // Any free text alongside a tool call is dropped: the reply the guest sees is
  // the tool's own `reply` argument, so there is exactly one place it comes from.
  return {
    ok: true,
    candidate:
      typeof toolCall.args === 'object' && toolCall.args !== null
        ? { ...toolCall.args, type: definition.responseType }
        : { type: definition.responseType },
  };
}
