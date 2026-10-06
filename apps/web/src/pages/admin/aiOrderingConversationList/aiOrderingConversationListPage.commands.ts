import { createAdminAiOrderingConversationsCommands } from '@/features/admin/aiOrdering/conversations/commands';

import type { AdminAiOrderingConversationsActions } from '@/features/admin/aiOrdering/conversations/actions';
import type { AdminAiOrderingConversationsCommands } from '@/features/admin/aiOrdering/conversations/commands';

export type AdminAiOrderingConversationListPageCommands = Pick<
  AdminAiOrderingConversationsCommands,
  'loadConversations'
>;

export function createAdminAiOrderingConversationListPageCommands(
  actions: AdminAiOrderingConversationsActions,
): AdminAiOrderingConversationListPageCommands {
  const commands = createAdminAiOrderingConversationsCommands(actions);

  return { loadConversations: commands.loadConversations };
}
