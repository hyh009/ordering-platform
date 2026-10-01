/**
 * A short hash of everything in a version that shapes what the model is asked
 * and what it is allowed to answer.
 *
 * This is what makes a DRAFT version safe to edit. `versionId` alone says which
 * label served a turn; after an edit it no longer says which prompt text did.
 * The fingerprint does, so a corpus full of `v1-2026-09-30` turns can still be
 * split into the runs that share a prompt and the ones that do not.
 *
 * For a STABLE version it is the enforcement: `aiOrdering.versions.test.ts` pins
 * the fingerprint of every stable version, so editing a frozen prompt fails the
 * suite instead of quietly redefining what its stored turns refer to.
 *
 * Deliberately NOT part of the hash:
 *
 * - `versionId` — the label and the content are separate questions. Renaming a
 *   version must not read as a behavior change, and two ids sharing a prompt
 *   should share a fingerprint.
 * - `status` — promoting draft to stable changes nothing the model sees. If
 *   promotion moved the fingerprint, the pinned value could never be recorded
 *   before promotion.
 * - `timeoutMs`, `maxTurnDurationMs` — operational budgets. They decide whether
 *   a turn completes, not what a completed turn says, and they are the settings
 *   most likely to be tuned per deployment.
 */

import { createHash } from 'node:crypto';

import type { AiOrderingVersionConfig } from '@src/modules/aiOrdering/types';

export function aiOrderingVersionFingerprint(
  config: AiOrderingVersionConfig,
): string {
  // Written as an explicit ordered tuple rather than serializing the object:
  // a field added to the config should not silently change every fingerprint,
  // and a field that belongs in the hash should be added here on purpose.
  const material = JSON.stringify([
    config.coreInstructions,
    config.summaryInstructions,
    config.maxSummaryCharacters,
    config.permitsAutomaticApplication,
    config.maxHistoryTurns,
    config.summarizeAfterAgedOutTurns,
    config.maxOperationsPerProposal,
    config.maxReplyCharacters,
  ]);

  return createHash('sha256').update(material).digest('hex').slice(0, 12);
}
