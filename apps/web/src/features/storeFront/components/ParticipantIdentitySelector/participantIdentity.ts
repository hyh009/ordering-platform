import { anonymousAvatarKeys, type AnonymousAvatarKey } from '@/models/cart';

export type ParticipantIdentityValues = {
  avatarKey: AnonymousAvatarKey;
  displayName: string;
};

export function getRandomAnonymousAvatarKey(
  random: () => number = Math.random,
): AnonymousAvatarKey {
  const index = Math.floor(random() * anonymousAvatarKeys.length);
  return anonymousAvatarKeys[index] ?? anonymousAvatarKeys[0];
}

export function createParticipantIdentityValues(
  random: () => number = Math.random,
): ParticipantIdentityValues {
  return {
    avatarKey: getRandomAnonymousAvatarKey(random),
    displayName: '',
  };
}

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
