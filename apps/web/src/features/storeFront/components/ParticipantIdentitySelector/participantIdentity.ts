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
