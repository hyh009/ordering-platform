import { V1_CORE_INSTRUCTIONS } from '@src/modules/aiOrdering/prompts/coreInstructions';
import { V1_SUMMARY_INSTRUCTIONS } from '@src/modules/aiOrdering/prompts/summaryInstructions';

import type { AiOrderingVersionConfig } from '@src/modules/aiOrdering/types';

/**
 * The first released assistant version.
 *
 * Frozen: once a version ships, its file is not edited again. Changing prompt
 * text or a limit here would silently redefine what a stored turn's `versionId`
 * refers to and destroy the baseline that version comparison depends on. Add a
 * new version file instead.
 *
 * `permitsAutomaticApplication` is false. No store can skip guest confirmation
 * on this version until it has been validated against real conversations, no
 * matter what its own setting says.
 */
export const AI_ORDERING_V1_2026_09_30: AiOrderingVersionConfig = {
  versionId: 'v1-2026-09-30',
  coreInstructions: V1_CORE_INSTRUCTIONS,
  summaryInstructions: V1_SUMMARY_INSTRUCTIONS,
  maxSummaryCharacters: 1000,
  permitsAutomaticApplication: false,
  maxHistoryTurns: 10,
  summarizeAfterAgedOutTurns: 5,
  maxOperationsPerProposal: 10,
  maxReplyCharacters: 1000,
  timeoutMs: 20_000,
  // Two planning calls plus a summary rebuild at 20s each, with slack for the
  // database and menu reads around them.
  maxTurnDurationMs: 75_000,
};
