import { describe, expect, it } from 'vitest';

import {
  aiOrderingProviderFailureReasons,
  mapAiOrderingProviderFailure,
} from '../src/modules/aiOrdering/runtime/failures.js';
import {
  isAiOrderingEnabled,
  resolveAiOrderingRuntime,
} from '../src/modules/aiOrdering/runtime/index.js';
import { AI_ORDERING_V1_2026_09_30 } from '../src/modules/aiOrdering/versions/index.js';

const config = AI_ORDERING_V1_2026_09_30;

describe('AI ordering runtime resolution', () => {
  it('is disabled when no version id is configured', () => {
    expect(
      resolveAiOrderingRuntime({
        apiKey: 'a-key-that-exists',
        modelName: 'gemini-3.5-flash-lite',
      }),
    ).toBeNull();
  });

  it('is disabled when a key exists but no version was selected', () => {
    // A credential sitting in the environment must never be enough to route
    // guest traffic to a metered provider.
    expect(
      resolveAiOrderingRuntime({
        versionId: undefined,
        apiKey: 'a-key-that-exists',
        modelName: 'gemini-3.5-flash-lite',
      }),
    ).toBeNull();
  });

  it('is disabled when a version is selected but no key is present', () => {
    expect(
      resolveAiOrderingRuntime({
        versionId: config.versionId,
        modelName: 'gemini-3.5-flash-lite',
      }),
    ).toBeNull();
  });

  it('is disabled on an unknown version id rather than throwing', () => {
    expect(() =>
      resolveAiOrderingRuntime({
        versionId: 'v99-does-not-exist',
        apiKey: 'a-key-that-exists',
        modelName: 'gemini-3.5-flash-lite',
      }),
    ).not.toThrow();
  });

  it('is disabled on a provider id that names no provider', () => {
    // Same treatment as an unknown version id: the assistant goes off and the
    // rest of the API keeps serving ordering, rather than the process refusing to
    // boot over one misconfigured value.
    expect(
      resolveAiOrderingRuntime({
        versionId: config.versionId,
        provider: 'a-provider-nobody-registered',
        apiKey: 'a-key-that-exists',
        modelName: 'gemini-3.5-flash-lite',
      }),
    ).toBeNull();
  });

  it('is off under an environment that sets none of the AI variables', () => {
    // The suite boots the API with the key, the provider, the model and the
    // version id all unset, which is the deployment default: the rest of the API
    // must come up with the assistant simply absent.
    expect(isAiOrderingEnabled()).toBe(false);
  });

  it('is enabled only when the version, the provider and the key are all present', () => {
    const runtime = resolveAiOrderingRuntime({
      versionId: config.versionId,
      provider: 'gemini',
      apiKey: 'a-key-that-exists',
      modelName: 'gemini-3.5-flash-lite',
    });

    expect(runtime?.config.versionId).toBe(config.versionId);
    expect(runtime?.provider).toBe('gemini');
    expect(runtime?.modelName).toBe('gemini-3.5-flash-lite');
  });
});

describe('AI ordering provider failure mapping', () => {
  it.each([
    [
      'timeout',
      Object.assign(new Error('The operation was aborted'), {
        name: 'AbortError',
      }),
    ],
    ['timeout', { status: 408 }],
    ['rate_limited', { status: 429 }],
    ['rate_limited', new Error('Quota exceeded for this project')],
    ['provider_unavailable', { status: 503 }],
    ['not_authorized', { status: 401 }],
    ['not_authorized', { status: 403 }],
    ['invalid_request', { status: 400 }],
    ['content_filtered', new Error('Candidate was blocked due to SAFETY')],
    ['unknown', new Error('something nobody has seen before')],
  ])('maps to %s', (expected, error) => {
    expect(mapAiOrderingProviderFailure(error)).toBe(expected);
  });

  it('never returns anything but a known reason', () => {
    const errors: unknown[] = [
      null,
      undefined,
      'a bare string',
      { weird: true },
      new Error(''),
    ];

    for (const error of errors) {
      expect(aiOrderingProviderFailureReasons).toContain(
        mapAiOrderingProviderFailure(error),
      );
    }
  });

  it('does not leak the provider message in what it returns', () => {
    const reason = mapAiOrderingProviderFailure(
      new Error(
        'prompt fragment: the guest said 幫我加珍奶, internal-id 12345',
      ),
    );

    // Raw provider errors carry prompt fragments and internal identifiers. They
    // belong in logs, never in what the caller passes on.
    expect(reason).not.toContain('幫我加珍奶');
    expect(reason).not.toContain('12345');
  });
});
