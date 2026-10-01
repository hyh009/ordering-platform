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

import type { AiOrderingToolCallingModelResult } from '../../src/modules/aiOrdering/runtime/model.js';

const AI_ORDERING_TOOL_NAME_BY_TYPE = {
  proposal: 'propose_cart_operations',
  choices: 'ask_choice',
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
  raw?: unknown,
): AiOrderingToolCallingModelResult {
  const { type, ...args } = response;

  if (type === 'message') {
    return { toolCalls: [], text: String(args.reply ?? ''), raw };
  }

  return {
    toolCalls: [{ name: AI_ORDERING_TOOL_NAME_BY_TYPE[type], args }],
    text: '',
    raw,
  };
}
