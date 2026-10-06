import { createAdminAiOrderingConversationsCommands } from '@/features/admin/aiOrdering/conversations/commands';

import type { AdminAiOrderingConversationsActions } from '@/features/admin/aiOrdering/conversations/actions';
import type { AdminAiOrderingConversationsCommands } from '@/features/admin/aiOrdering/conversations/commands';

export type AdminAiOrderingConversationDetailPageCommands = Pick<
  AdminAiOrderingConversationsCommands,
  'loadConversation' | 'clearConversation'
>;

export function createAdminAiOrderingConversationDetailPageCommands(
  actions: AdminAiOrderingConversationsActions,
): AdminAiOrderingConversationDetailPageCommands {
  const commands = createAdminAiOrderingConversationsCommands(actions);

  return {
    loadConversation: commands.loadConversation,
    clearConversation: commands.clearConversation,
  };
}
