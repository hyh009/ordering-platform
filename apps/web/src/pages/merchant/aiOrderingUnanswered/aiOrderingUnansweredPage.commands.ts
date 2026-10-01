import { createAiOrderingUnansweredCommands } from '@/features/merchant/aiOrdering/unanswered/commands';

import type { AiOrderingUnansweredActions } from '@/features/merchant/aiOrdering/unanswered/actions';
import type { AiOrderingUnansweredCommands } from '@/features/merchant/aiOrdering/unanswered/commands';

export type AiOrderingUnansweredPageCommands = AiOrderingUnansweredCommands;

export function createAiOrderingUnansweredPageCommands(
  actions: AiOrderingUnansweredActions,
): AiOrderingUnansweredPageCommands {
  return createAiOrderingUnansweredCommands(actions);
}
