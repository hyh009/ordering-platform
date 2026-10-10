/**
 * Test-only scaffolding around the frozen evaluation fixture.
 *
 * The fixture itself lives in `src/modules/aiOrdering/evaluation/fixture.ts`
 * because the replay tool ships with the API and runs against it. Only the
 * helper that fakes a provider reply belongs to the tests, so only that is here.
 */

export {
  AI_ORDERING_CART_FIXTURE,
  AI_ORDERING_FIXTURE_CART_ID,
  AI_ORDERING_FIXTURE_PARTICIPANT_OTHER,
  AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
  AI_ORDERING_FIXTURE_STORE_ID,
  AI_ORDERING_MENU_FIXTURE,
} from '../../src/modules/aiOrdering/evaluation/fixture.js';

import { AIMessage } from '@langchain/core/messages';

/** The gate's input shape: what a provider reply reduces to before validation. */
export type AiOrderingModelReplyFixture = {
  toolCalls: { name: string; args: unknown }[];
  text: string;
};

const AI_ORDERING_TOOL_NAME_BY_TYPE = {
  proposal: 'propose_cart_operations',
  choices: 'ask_choices',
  unanswered: 'report_unanswerable',
} as const;

/**
 * Builds the provider reply a model produces when its answer is `response`.
 *
 * `type` becomes the tool it called and everything else becomes the arguments,
 * except for `message`, which is the answer the model gives by calling no tool at
 * all. Hostile or malformed replies are written out by hand instead.
 */
export function aiOrderingModelReplyFor(
  response: { type: keyof typeof AI_ORDERING_TOOL_NAME_BY_TYPE | 'message' } & {
    [key: string]: unknown;
  },
): AiOrderingModelReplyFixture {
  const { type, ...args } = response;

  if (type === 'message') {
    return { toolCalls: [], text: String(args.reply ?? '') };
  }

  return {
    toolCalls: [{ name: AI_ORDERING_TOOL_NAME_BY_TYPE[type], args }],
    text: '',
  };
}

/**
 * The same answer as a provider MESSAGE, for scripting a fake model.
 *
 * Separate from the gate-shaped helper above because they sit on opposite sides
 * of the same boundary: one is what a provider sends, the other is what the gate
 * reads once the agent has reduced it.
 */
export function aiOrderingModelMessageFor(
  response: Parameters<typeof aiOrderingModelReplyFor>[0],
): AIMessage {
  const reply = aiOrderingModelReplyFor(response);
  const [toolCall] = reply.toolCalls;

  if (!toolCall) {
    return new AIMessage(reply.text);
  }

  return new AIMessage({
    content: '',
    tool_calls: [
      {
        id: `call_${toolCall.name}`,
        name: toolCall.name,
        args: toolCall.args as Record<string, unknown>,
      },
    ],
  });
}
