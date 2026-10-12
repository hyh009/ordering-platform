/**
 * What this module offers the rest of the API.
 *
 * Everything the application needs to run a guest's assistant turn is named
 * here, and the application imports nothing else from inside this folder. That
 * makes the boundary something the compiler can see rather than something the
 * next reader has to infer from thirty-five files, and it is what a later move
 * out of `apps/api` would have to preserve.
 *
 * Two deliberate exceptions, which are not holes:
 *
 * - Unit tests import the file they are testing. A test of `shortCodes` is a
 *   test of a unit, not of the module's surface, and routing it through here
 *   would either hide the unit or widen this list until it stops meaning
 *   anything.
 * - The replay harness (`evaluation/`) and the CLI that drives it reach for
 *   internals on purpose: the version registry, the provider adapters, the
 *   agent. It is a development tool for measuring this module, not a thing the
 *   module offers, and a future extraction should be free to leave it behind.
 *
 * The module depends outward on `config/env`, `config/redis`, `utils/logger`
 * and `utils/errors` only. It reaches for no cart, menu, store or order
 * service: a cart and a menu arrive as data, from the caller. Keeping that true
 * is most of what keeps this boundary worth having.
 */

// ── Prompt assembly ───────────────────────────────────────────────────────────
export {
  buildAiOrderingContext,
  writeAiOrderingName,
} from '@src/modules/aiOrdering/context';
export {
  planAiOrderingSummarization,
  windowAiOrderingHistory,
} from '@src/modules/aiOrdering/history';
export { buildAiOrderingPromptPrelude } from '@src/modules/aiOrdering/promptPrelude';
export {
  buildAiOrderingSupersededResults,
  readAiOrderingEarlierProposals,
  readAiOrderingLastProposal,
  resolveAiOrderingPrompt,
} from '@src/modules/aiOrdering/promptResolution';
export { generateAiOrderingSummary } from '@src/modules/aiOrdering/summary';

// ── Running a turn ────────────────────────────────────────────────────────────
export { resolveAiOrderingRuntime } from '@src/modules/aiOrdering/runtime';
export {
  AI_ORDERING_PROPOSAL_TOOL,
  createAiOrderingAgent,
} from '@src/modules/aiOrdering/runtime/agent';
export { createAiOrderingDebugTrace } from '@src/modules/aiOrdering/runtime/debugTrace';
export { mapAiOrderingProviderFailure } from '@src/modules/aiOrdering/runtime/failures';

// ── Answering the guest ───────────────────────────────────────────────────────
export { resolveAiOrderingConfirmationRequired } from '@src/modules/aiOrdering/confirmation';
export { resolveAiOrderingProposalChoices } from '@src/modules/aiOrdering/openChoices';
export { buildAiOrderingOperationLabel } from '@src/modules/aiOrdering/operationLabel';

// ── Process-level concerns ────────────────────────────────────────────────────
export { createRedisAiOrderingRateLimiter } from '@src/modules/aiOrdering/rateLimit.redis';
export {
  closeAiOrderingCheckpointer,
  getAiOrderingCheckpointer,
} from '@src/modules/aiOrdering/runtime/checkpointer';
/** Whether a store serves the assistant at all — read while building its menu. */
export { isAiOrderingEnabled } from '@src/modules/aiOrdering/runtime';
export { aiOrderingVersionFingerprint } from '@src/modules/aiOrdering/versions/fingerprint';

// ── Types ─────────────────────────────────────────────────────────────────────
export type { AiOrderingRateLimiter } from '@src/modules/aiOrdering/rateLimit';
export type { AiOrderingRuntime } from '@src/modules/aiOrdering/runtime';
export type { AiOrderingRunRecord } from '@src/modules/aiOrdering/runtime/agent';
