export type AiOrderingConfirmationInput = {
  /** Whether the released version allows a store to skip confirmation at all. */
  versionPermitsAutomaticApplication: boolean;
  /** The store's own setting. Absent on stores that never configured it. */
  storeAutoApplyCartOperations?: boolean;
};

/**
 * Resolves whether the guest must confirm before a proposal is applied.
 *
 * Two independent axes, ANDed: stability belongs to the version, preference
 * belongs to the store. Skipping confirmation needs both to agree.
 *
 * The asymmetry is deliberate. A new prompt version ships with automatic
 * application disallowed, so every store silently falls back to confirming until
 * that version has been validated — a version experiment can never weaken a
 * store's confirmation step, while a store that wants confirmation always gets
 * it regardless of the version.
 *
 * Resolved server-side and handed to the client as a flag. The model is never
 * asked for it: a model-supplied `false` would bypass the store's setting
 * outright.
 */
export function resolveAiOrderingConfirmationRequired(
  input: AiOrderingConfirmationInput,
): boolean {
  const mayApplyAutomatically =
    input.versionPermitsAutomaticApplication &&
    input.storeAutoApplyCartOperations === true;

  return !mayApplyAutomatically;
}
