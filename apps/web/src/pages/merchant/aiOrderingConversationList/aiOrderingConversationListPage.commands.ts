import { createAiOrderingConversationsCommands } from '@/features/merchant/aiOrdering/conversations/commands';

import type { AiOrderingConversationsActions } from '@/features/merchant/aiOrdering/conversations/actions';
import type { AiOrderingConversationsCommands } from '@/features/merchant/aiOrdering/conversations/commands';

export type AiOrderingConversationListPageCommands = Pick<
  AiOrderingConversationsCommands,
  'loadConversations'
>;

export function createAiOrderingConversationListPageCommands(
  actions: AiOrderingConversationsActions,
): AiOrderingConversationListPageCommands {
  const commands = createAiOrderingConversationsCommands(actions);

  return { loadConversations: commands.loadConversations };
}
