import { V1_CORE_INSTRUCTIONS } from '@src/modules/aiOrdering/prompts/coreInstructions';
import { V1_SUMMARY_INSTRUCTIONS } from '@src/modules/aiOrdering/prompts/summaryInstructions';

import type { AiOrderingVersionConfig } from '@src/modules/aiOrdering/types';

/**
 * The first assistant version. Still a DRAFT.
 *
 * Draft means this file may be edited: the prompt is being shaped against real
 * conversations, and its stored turns are development data rather than a
 * baseline. Every turn records the version's fingerprint beside its id, so even
 * across edits the corpus says which prompt text produced which turn.
 *
 * Promoting it to `stable` freezes it. From then on, changing prompt text or a
 * limit here fails `aiOrdering.versions.test.ts`, which pins every stable
 * version's fingerprint — add a new version file instead.
 *
 * `permitsAutomaticApplication` is false. No store can skip guest confirmation
 * on this version until it has been validated against real conversations, no
 * matter what its own setting says.
 */
export const AI_ORDERING_V1_2026_09_30: AiOrderingVersionConfig = {
  versionId: 'v1-2026-09-30',
  status: 'draft',
  coreInstructions: V1_CORE_INSTRUCTIONS,
  summaryInstructions: V1_SUMMARY_INSTRUCTIONS,
  maxSummaryCharacters: 1000,
  permitsAutomaticApplication: false,
  maxHistoryTurns: 10,
  summarizeAfterAgedOutTurns: 5,
  maxOperationsPerProposal: 10,
  maxReplyCharacters: 1000,
  // Nothing this assistant does has more than one right answer: it picks ids
  // out of a fixed menu, carries over the choices the guest stated, and leaves
  // the rest empty. Sampling can only invent a choice nobody asked for, and the
  // same prompt scored 10, 11 and 9 out of 14 on three consecutive runs at the
  // provider's default.
  temperature: 0,
  timeoutMs: 20_000,
  // Two planning calls plus a summary rebuild at 20s each, with slack for the
  // database and menu reads around them.
  maxTurnDurationMs: 75_000,
};
