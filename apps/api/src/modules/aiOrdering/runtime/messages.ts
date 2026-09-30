import { HumanMessage, SystemMessage } from '@langchain/core/messages';

import type { BaseMessage } from '@langchain/core/messages';
import type { AiOrderingModelCall } from '@src/modules/aiOrdering/planner';

/**
 * Maps assembled context blocks onto provider messages, in order.
 *
 * The order is load-bearing, not cosmetic: the provider's implicit cache matches
 * on a common prefix, and `context.ts` already ordered the blocks most-static
 * first. This function must preserve that order exactly.
 *
 * A repair note is appended LAST, after every block, so a correction never
 * disturbs the cached prefix that the first attempt just established.
 */
export function toAiOrderingProviderMessages(
  call: AiOrderingModelCall,
): BaseMessage[] {
  const messages: BaseMessage[] = call.context.blocks.map((block) =>
    block.role === 'system'
      ? new SystemMessage(block.text)
      : new HumanMessage(block.text),
  );

  if (call.repairNote !== undefined) {
    messages.push(new HumanMessage(call.repairNote));
  }

  return messages;
}
