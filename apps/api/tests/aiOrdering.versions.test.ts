import { describe, expect, it } from 'vitest';

import {
  AI_ORDERING_MENU_FIXTURE,
  AI_ORDERING_FIXTURE_STORE_ID,
} from './fixtures/aiOrdering.js';
import { V1_CORE_INSTRUCTIONS } from '../src/modules/aiOrdering/prompts/coreInstructions.js';
import { aiOrderingVersionFingerprint } from '../src/modules/aiOrdering/versions/fingerprint.js';
import {
  AI_ORDERING_V1_2026_09_30,
  listAiOrderingVersionIds,
  resolveAiOrderingVersion,
} from '../src/modules/aiOrdering/versions/index.js';

describe('AI ordering version registry', () => {
  it('resolves a released version id', () => {
    const version = resolveAiOrderingVersion('v1-2026-09-30');

    expect(version).toBe(AI_ORDERING_V1_2026_09_30);
  });

  it('treats an unset version id as the assistant being disabled', () => {
    expect(resolveAiOrderingVersion(undefined)).toBeNull();
  });

  it('falls back to disabled on an unknown version id instead of throwing', () => {
    // A misconfigured version id must not be able to stop the storefront API
    // from serving ordering, and must not silently serve guests some other
    // version's prompt either.
    expect(() => resolveAiOrderingVersion('v99-does-not-exist')).not.toThrow();
    expect(resolveAiOrderingVersion('v99-does-not-exist')).toBeNull();
  });

  it('lists the released version ids', () => {
    expect(listAiOrderingVersionIds()).toContain('v1-2026-09-30');
  });

  it('starts a new version with automatic application disallowed', () => {
    // Until a version has been validated, no store setting may skip the guest's
    // confirmation step on it.
    expect(AI_ORDERING_V1_2026_09_30.permitsAutomaticApplication).toBe(false);
  });
});

describe('AI ordering core instructions', () => {
  it('contains no store-specific text', () => {
    // Layer one is identical for every store on this version: that is what lets
    // the provider cache the prefix, and what makes the version reproducible.
    // Anything store-, guest- or turn-specific belongs in a later block.
    const storeSpecificValues = [
      AI_ORDERING_FIXTURE_STORE_ID,
      ...AI_ORDERING_MENU_FIXTURE.groups.flatMap((group) => [
        ...(group.category ? [group.category.id] : []),
        ...group.products.flatMap((product) => [
          product.id,
          product.name['zh-TW'] ?? '',
          product.name.en ?? '',
        ]),
      ]),
      ...AI_ORDERING_MENU_FIXTURE.modifiers.map((modifier) => modifier.id),
    ].filter(Boolean);

    for (const value of storeSpecificValues) {
      expect(
        V1_CORE_INSTRUCTIONS,
        `core instructions should not mention "${value}"`,
      ).not.toContain(value);
    }
  });

  it('states the rules the validation stage also enforces', () => {
    // The prompt is guidance, not a guarantee — but it should at least agree
    // with what validation will reject, or every turn needs a repair.
    expect(V1_CORE_INSTRUCTIONS).toContain('sold out');
    expect(V1_CORE_INSTRUCTIONS).toContain('read-only');
    expect(V1_CORE_INSTRUCTIONS.toLowerCase()).toContain('never use a name');
  });

  it('tells the model it cannot submit an order', () => {
    expect(V1_CORE_INSTRUCTIONS.toLowerCase()).toContain(
      'placing, submitting, paying for, or cancelling the final order is done by the guest',
    );
  });
});

/**
 * The fingerprint of every STABLE version, pinned.
 *
 * Add an entry here when, and only when, a version is promoted to `stable`.
 * After that, any edit to its prompt or limits changes the hash and fails the
 * assertions below — which is the whole mechanism: freezing a released version
 * is enforced here rather than remembered by whoever opens the file.
 *
 * Draft versions are deliberately absent. They are meant to be edited.
 */
const PINNED_STABLE_FINGERPRINTS: Record<string, string> = {};

function allVersions() {
  return listAiOrderingVersionIds().map((versionId) => {
    const version = resolveAiOrderingVersion(versionId);
    if (!version) throw new Error(`registry lost ${versionId}`);
    return version;
  });
}

describe('AI ordering version freezing', () => {
  it('v1 is still a draft', () => {
    // Recorded here so promoting it is a deliberate edit to this file, not a
    // side effect of someone changing the config.
    expect(AI_ORDERING_V1_2026_09_30.status).toBe('draft');
  });

  it('pins exactly the stable versions, no more and no fewer', () => {
    const stableIds = allVersions()
      .filter((version) => version.status === 'stable')
      .map((version) => version.versionId)
      .sort();

    // Promoting a version without pinning its fingerprint would leave it
    // editable while claiming to be frozen, so that must fail here.
    expect(Object.keys(PINNED_STABLE_FINGERPRINTS).sort()).toEqual(stableIds);
  });

  it('every stable version still hashes to its pinned fingerprint', () => {
    for (const version of allVersions()) {
      if (version.status !== 'stable') continue;

      expect(
        aiOrderingVersionFingerprint(version),
        `${version.versionId} is stable and was edited; add a new version instead`,
      ).toBe(PINNED_STABLE_FINGERPRINTS[version.versionId]);
    }
  });
});

describe('AI ordering version fingerprint', () => {
  it('is stable across calls', () => {
    expect(aiOrderingVersionFingerprint(AI_ORDERING_V1_2026_09_30)).toBe(
      aiOrderingVersionFingerprint(AI_ORDERING_V1_2026_09_30),
    );
  });

  it('changes when the prompt changes', () => {
    expect(
      aiOrderingVersionFingerprint({
        ...AI_ORDERING_V1_2026_09_30,
        coreInstructions: `${V1_CORE_INSTRUCTIONS} One more rule.`,
      }),
    ).not.toBe(aiOrderingVersionFingerprint(AI_ORDERING_V1_2026_09_30));
  });

  it('changes when the shape the model must answer in changes', () => {
    // Asserted in aiOrdering.fingerprintShape.test.ts, which has to reload the
    // module to vary the shape. Noted here so the freezing story reads whole:
    // a stable version's ANSWER SHAPE is now as frozen as its prompt.
    expect(aiOrderingVersionFingerprint(AI_ORDERING_V1_2026_09_30)).toHaveLength(
      12,
    );
  });

  it('changes when a limit the model is held to changes', () => {
    expect(
      aiOrderingVersionFingerprint({
        ...AI_ORDERING_V1_2026_09_30,
        maxOperationsPerProposal: 3,
      }),
    ).not.toBe(aiOrderingVersionFingerprint(AI_ORDERING_V1_2026_09_30));
  });

  it('does not change when the version is renamed', () => {
    // The label and the content are separate questions. Two ids sharing a
    // prompt should share a fingerprint.
    expect(
      aiOrderingVersionFingerprint({
        ...AI_ORDERING_V1_2026_09_30,
        versionId: 'v1-renamed',
      }),
    ).toBe(aiOrderingVersionFingerprint(AI_ORDERING_V1_2026_09_30));
  });

  it('does not change when a draft is promoted to stable', () => {
    // Otherwise the pinned value could never be recorded before promotion.
    expect(
      aiOrderingVersionFingerprint({
        ...AI_ORDERING_V1_2026_09_30,
        status: 'stable',
      }),
    ).toBe(aiOrderingVersionFingerprint(AI_ORDERING_V1_2026_09_30));
  });

  it('does not change when an operational timeout is tuned', () => {
    expect(
      aiOrderingVersionFingerprint({
        ...AI_ORDERING_V1_2026_09_30,
        timeoutMs: 30_000,
        maxTurnDurationMs: 90_000,
      }),
    ).toBe(aiOrderingVersionFingerprint(AI_ORDERING_V1_2026_09_30));
  });
});
