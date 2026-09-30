import { describe, expect, it } from 'vitest';

import {
  AI_ORDERING_MENU_FIXTURE,
  AI_ORDERING_FIXTURE_STORE_ID,
} from './fixtures/aiOrdering.js';
import { V1_CORE_INSTRUCTIONS } from '../src/modules/aiOrdering/prompts/coreInstructions.js';
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
      'cannot place, submit',
    );
  });
});
