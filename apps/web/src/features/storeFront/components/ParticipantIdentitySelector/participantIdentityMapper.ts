import type { AnonymousAvatarKey } from '@/models/cart';
import type { ParticipantIdentityValues } from './participantIdentity';

export type ParticipantIdentitySubmission = {
  avatarKey: AnonymousAvatarKey;
  displayName?: string;
};

/**
 * Shapes selected identity values into the fields create/join cart requests
 * expect: the avatar key is always sent, and a trimmed display name only when
 * the participant actually typed one.
 */
export function toParticipantIdentitySubmission(
  values: ParticipantIdentityValues,
): ParticipantIdentitySubmission {
  const displayName = values.displayName.trim();
  return {
    avatarKey: values.avatarKey,
    ...(displayName.length > 0 ? { displayName } : {}),
  };
}
