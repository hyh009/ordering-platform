export const aiOrderingProviderFailureReasons = [
  'timeout',
  'rate_limited',
  'provider_unavailable',
  'not_authorized',
  'invalid_request',
  'content_filtered',
  'unknown',
] as const;

export type AiOrderingProviderFailureReason =
  (typeof aiOrderingProviderFailureReasons)[number];

function readStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
  };

  for (const value of [
    candidate.status,
    candidate.statusCode,
    candidate.response?.status,
  ]) {
    if (typeof value === 'number') {
      return value;
    }
  }

  return undefined;
}

function readText(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name} ${error.message}`.toLowerCase();
  }

  return typeof error === 'string' ? error.toLowerCase() : '';
}

/**
 * Maps a provider error onto a stable internal reason.
 *
 * Returns a reason and nothing else — deliberately. Raw provider errors carry
 * prompt fragments, internal identifiers, and wording that changes without
 * warning, so they must reach logs and metrics but never the guest and never the
 * model. The caller logs the original alongside this reason.
 *
 * Status codes are checked before message text because they are the part of a
 * provider's error surface least likely to be reworded.
 */
export function mapAiOrderingProviderFailure(
  error: unknown,
): AiOrderingProviderFailureReason {
  const text = readText(error);

  // An abort is our own timeout firing, so it is checked before anything the
  // provider reports.
  if (
    text.includes('aborterror') ||
    text.includes('timeouterror') ||
    text.includes('aborted') ||
    text.includes('timed out') ||
    text.includes('timeout')
  ) {
    return 'timeout';
  }

  const status = readStatus(error);

  if (status !== undefined) {
    if (status === 408) {
      return 'timeout';
    }

    if (status === 429) {
      return 'rate_limited';
    }

    if (status === 401 || status === 403) {
      return 'not_authorized';
    }

    if (status >= 500) {
      return 'provider_unavailable';
    }

    if (status >= 400) {
      return 'invalid_request';
    }
  }

  if (
    text.includes('safety') ||
    text.includes('blocked') ||
    text.includes('content filter')
  ) {
    return 'content_filtered';
  }

  if (text.includes('quota') || text.includes('rate limit')) {
    return 'rate_limited';
  }

  return 'unknown';
}
