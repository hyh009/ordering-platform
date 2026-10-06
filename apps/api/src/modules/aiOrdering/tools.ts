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
    description: `Propose one or more changes to the guest's current cart for their review.

Use this tool once the guest has said what they want and every choice on it is settled.

Do not use it while the guest is asking about a product, comparing options, or browsing, and do not use it for a product that still has an unsettled choice — \`ask_choices\` comes first.

Important rules:
- Each entry adds one more of a product, changes an item the guest added themselves, or removes one.
- Include only what is being added, changed, or removed. Never restate an unchanged item that is already in the cart.
- Put every cart change the guest asked for this turn into this one call.
- Everything a change does must be in that change's own fields. If your reply says you are doing something, the operation has to say it too: wording in a reply is not an instruction.
- This tool proposes; it does not apply. The guest reviews and accepts. Never say or imply that the cart has already changed.
- The \`reply\` introduces this proposal and nothing else. Do not ask a question in it: the guest's confirm button would then answer something other than your question.`,
    schema: aiOrderingModelArgumentSchemas.proposal,
  },
  {
    name: 'ask_choices',
    responseType: 'choices',
    description: `Ask the guest for the choices you still need before anything can be proposed.

Use this tool when a product the guest asked for has any choice that is not settled: a required one they have not made, or an optional one they have not mentioned.

Do not use it to confirm something the guest already told you, to ask whether they want a product they have already asked for, or to ask anything that is not a choice between options — a plain reply is for that.

Important rules:
- Ask for every unsettled choice on every product the guest asked for in this one call: the first in \`question\` and \`options\`, each remaining one as its own entry in \`additionalQuestions\`. Never ask them one turn at a time, and never give an optional choice a turn of its own.
- One question covers exactly one choice. Never merge two choices into a single question.
- An optional choice's options must include a clear way to decline.
- The guest may answer by typing instead of picking, so the options need not be exhaustive.`,
    schema: aiOrderingModelArgumentSchemas.choices,
  },
  {
    name: 'report_unanswerable',
    responseType: 'unanswered',
    description: `State that you cannot answer, with the reason.

Use this tool whenever the store data, cart data and conversation you were given do not contain the answer. Saying so is a good answer: the guest is told honestly, and the merchant is told which detail to add.

Do not use it when the data does answer. Listing what is on the menu, describing a product from its data, or saying that something is marked sold out are plain-text answers: reply in text and call no tool.

Important rules:
- "The data does not say" and "the store does not have it" are different answers. Never turn the first into the second: answering "no, we do not have that" when the data is merely silent is a wrong answer, not a safe one.
- When part of the question can be answered from the data, answer that part in plain text and say what you cannot tell them.

Typical questions that belong here:
- missing_product_info — what is in a dish, whether it contains an allergen, how spicy or how large it is, how it is cooked, calories: anything about a product the menu data does not state.
- out_of_scope — parking, opening hours, wifi, toilets, delivery, reservations, payment methods, discounts, refunds, staff, directions: anything about the store that is not its menu or this cart.
- unclear_request — you cannot tell what was asked at all, and there is no choice you could offer to settle it.`,
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
