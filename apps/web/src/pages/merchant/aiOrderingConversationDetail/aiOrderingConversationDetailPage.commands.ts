import { createAiOrderingConversationsCommands } from '@/features/merchant/aiOrdering/conversations/commands';

import type { AiOrderingConversationsActions } from '@/features/merchant/aiOrdering/conversations/actions';
import type { AiOrderingConversationsCommands } from '@/features/merchant/aiOrdering/conversations/commands';

export type AiOrderingConversationDetailPageCommands = Pick<
  AiOrderingConversationsCommands,
  'loadConversation' | 'clearConversation'
>;

export function createAiOrderingConversationDetailPageCommands(
  actions: AiOrderingConversationsActions,
): AiOrderingConversationDetailPageCommands {
  const commands = createAiOrderingConversationsCommands(actions);

  return {
    loadConversation: commands.loadConversation,
    clearConversation: commands.clearConversation,
  };
}
