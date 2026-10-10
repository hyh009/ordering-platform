import { describe, expect, it } from 'vitest';

import { resolveAiOrderingConfirmationRequired } from '../src/modules/aiOrdering/confirmation.js';
import { AI_ORDERING_V1_2026_09_30 } from '../src/modules/aiOrdering/versions/index.js';

describe('AI ordering confirmation mode', () => {
  it('skips confirmation only when the store and the version both allow it', () => {
    expect(
      resolveAiOrderingConfirmationRequired({
        versionPermitsAutomaticApplication: true,
        storeAutoApplyCartOperations: true,
      }),
    ).toBe(false);
  });

  it('still confirms when the store opted in but the version does not allow it', () => {
    // A version experiment must never be able to weaken a store's confirmation
    // step, so the version's permission is a ceiling the store cannot raise.
    expect(
      resolveAiOrderingConfirmationRequired({
        versionPermitsAutomaticApplication: false,
        storeAutoApplyCartOperations: true,
      }),
    ).toBe(true);
  });

  it('still confirms when the version allows it but the store did not opt in', () => {
    expect(
      resolveAiOrderingConfirmationRequired({
        versionPermitsAutomaticApplication: true,
        storeAutoApplyCartOperations: false,
      }),
    ).toBe(true);
  });

  it('confirms when neither allows it', () => {
    expect(
      resolveAiOrderingConfirmationRequired({
        versionPermitsAutomaticApplication: false,
        storeAutoApplyCartOperations: false,
      }),
    ).toBe(true);
  });

  it('confirms when the store never configured the setting', () => {
    expect(
      resolveAiOrderingConfirmationRequired({
        versionPermitsAutomaticApplication: true,
      }),
    ).toBe(true);
  });

  it('confirms on the released version no matter what the store asks for', () => {
    // The shipped version has not been validated against real conversations, so
    // every store confirms on it today.
    expect(
      resolveAiOrderingConfirmationRequired({
        versionPermitsAutomaticApplication:
          AI_ORDERING_V1_2026_09_30.permitsAutomaticApplication,
        storeAutoApplyCartOperations: true,
      }),
    ).toBe(true);
  });
});
