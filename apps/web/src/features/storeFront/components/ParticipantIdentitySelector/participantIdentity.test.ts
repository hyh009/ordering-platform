import { describe, expect, it } from 'vitest';
import { anonymousAvatarKeys } from '@/models/cart';
import {
  createParticipantIdentityValues,
  getRandomAnonymousAvatarKey,
} from './participantIdentity';

describe('participant identity defaults', () => {
  it('selects an avatar using the provided random source', () => {
    expect(getRandomAnonymousAvatarKey(() => 0)).toBe(anonymousAvatarKeys[0]);
    expect(getRandomAnonymousAvatarKey(() => 0.999999)).toBe(
      anonymousAvatarKeys.at(-1),
    );
  });

  it('starts with a randomly selected avatar and an empty custom name', () => {
    expect(createParticipantIdentityValues(() => 0)).toEqual({
      avatarKey: anonymousAvatarKeys[0],
      displayName: '',
    });
  });
});
