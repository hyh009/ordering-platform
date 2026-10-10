import { AI_ORDERING_V1_2026_09_30 } from '@src/modules/aiOrdering/versions/v1-2026-09-30';
import { logger } from '@src/utils/logger';

import type { AiOrderingVersionConfig } from '@src/modules/aiOrdering/types';

export { AI_ORDERING_V1_2026_09_30 } from '@src/modules/aiOrdering/versions/v1-2026-09-30';

const releasedVersions: readonly AiOrderingVersionConfig[] = [
  AI_ORDERING_V1_2026_09_30,
];

const versionsById = new Map(
  releasedVersions.map((version) => [version.versionId, version]),
);

export function listAiOrderingVersionIds(): string[] {
  return [...versionsById.keys()];
}

/**
 * Resolves the configured version, or `null` when the assistant is off.
 *
 * `null` means disabled, and disabled is the fallback for BOTH an unset version
 * id and an unrecognized one. Two things follow from that:
 *
 * - A misconfigured version id never throws. The assistant is one feature of the
 *   storefront API and must not be able to stop it from serving ordering.
 * - It also never silently degrades to some other version. Serving guests with a
 *   prompt nobody selected is worse than serving them the manual ordering flow,
 *   which stays fully usable with the assistant off.
 *
 * An unrecognized id is logged as a warning, because a deployment that believes
 * the assistant is on while it is off is exactly the kind of thing that
 * otherwise surfaces weeks later.
 */
export function resolveAiOrderingVersion(
  versionId: string | undefined,
): AiOrderingVersionConfig | null {
  if (!versionId) {
    return null;
  }

  const version = versionsById.get(versionId);

  if (!version) {
    logger.warn(
      { versionId, knownVersionIds: listAiOrderingVersionIds() },
      'Unknown AI ordering version id; the assistant stays disabled',
    );

    return null;
  }

  return version;
}
