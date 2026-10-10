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
 * The ANSWER SHAPE is hashed too, not just the instructions. The shape the model
 * must answer in is half the contract; without it, changing the fields the model
 * is asked for leaves no trace, and two runs answering in different shapes
 * compare as though they were the same version.
 *
 * So are the TOOL NAMES AND DESCRIPTIONS. They are prompt text — the model reads
 * them to decide which answer it is giving — and they hold the rules this module
 * deliberately keeps out of `coreInstructions`, since a tool's own boundary
 * belongs to that tool. Leaving them out was not a theoretical gap: rewriting
 * one tool's description changed a regression case's outcome twice in a row
 * while the fingerprint stayed identical, which is exactly the corpus being
 * quietly made non-comparable. Only the name, the response type and the
 * description are hashed here; a tool's schema is already in the answer shape
 * above and hashing it twice would say nothing more.
 *
 * Deliberately NOT part of the hash:
 *
 * - `versionId` — the label and the content are separate questions. Renaming a
 *   version must not read as a behavior change, and two ids sharing a prompt
 *   should share a fingerprint.
 * - the PROVIDER'S dialect of that shape. The hash is taken before any
 *   provider-specific rewrite, because the fingerprint says what this version
 *   asks of a model, not how one vendor's parser spells it. A Gemini dialect fix
 *   must not read as a version change, and one version served through two
 *   providers must share a fingerprint — the provider and model are recorded
 *   separately on every turn so that axis stays separate.
 * - `status` — promoting draft to stable changes nothing the model sees. If
 *   promotion moved the fingerprint, the pinned value could never be recorded
 *   before promotion.
 * - `timeoutMs`, `maxTurnDurationMs` — operational budgets. They decide whether
 *   a turn completes, not what a completed turn says, and they are the settings
 *   most likely to be tuned per deployment.
 *
 * `temperature` IS part of the hash, on the other side of that same line: it
 * decides what a completed turn says. A suite scored at one temperature does
 * not describe a deployment running at another, so the two must not share a
 * fingerprint.
 */

import { createHash } from 'node:crypto';

import { aiOrderingModelArgumentSchemas } from '@src/modules/aiOrdering/modelResponse';
import { aiOrderingToolDefinitions } from '@src/modules/aiOrdering/tools';
import { z } from 'zod';


import type { AiOrderingVersionConfig } from '@src/modules/aiOrdering/types';

/**
 * The answer shape, serialized once.
 *
 * Computed at module load because it does not vary by version: every released
 * version currently shares one model-facing contract. When one needs its own,
 * this becomes a per-version field and the call below reads it from `config`.
 */
const MODEL_ANSWER_SHAPE = JSON.stringify(
  Object.entries(aiOrderingModelArgumentSchemas)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, schema]) => [name, z.toJSONSchema(schema, { io: 'input' })]),
);

/**
 * Every tool as the model is asked to choose between them, serialized once.
 *
 * Computed at module load for the same reason as the shape above: one
 * model-facing tool set currently serves every released version. Sorted by name
 * so that reordering the list is not a version change, since the model is given
 * a set and not a sequence.
 */
const MODEL_TOOL_SURFACE = JSON.stringify(
  [...aiOrderingToolDefinitions]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((tool) => [tool.name, tool.responseType, tool.description]),
);

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
    config.temperature,
    MODEL_ANSWER_SHAPE,
    MODEL_TOOL_SURFACE,
  ]);

  return createHash('sha256').update(material).digest('hex').slice(0, 12);
}
