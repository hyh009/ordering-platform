import { describe, expect, it, vi } from 'vitest';
import {
  getAnonymousAvatarLabel,
  getOrderingParticipantDisplayName,
} from './display';

const tDefault = vi.fn(
  (_key: string, defaultValue: string, options?: Record<string, unknown>) =>
    defaultValue.replace(/\{\{(\w+)\}\}/g, (_match, key: string) =>
      String(options?.[key] ?? ''),
    ),
);

describe('cart display helpers', () => {
  it('returns an explicit localized animal label', () => {
    expect(getAnonymousAvatarLabel('flamingo', tDefault)).toBe('Flamingo');
    expect(tDefault).toHaveBeenLastCalledWith(
      'guest.participant.avatars.flamingo',
      'Flamingo',
    );
  });

  it('prefers a custom participant display name', () => {
    expect(
      getOrderingParticipantDisplayName(
        {
          avatarKey: 'rainbow_cat',
          displayName: '  Mia  ',
          id: 'participant-12345',
        },
        tDefault,
      ),
    ).toBe('Mia');
  });

  it('derives an anonymous name from the animal and participant id suffix', () => {
    expect(
      getOrderingParticipantDisplayName(
        { avatarKey: 'owl', id: 'participant-ab12c' },
        tDefault,
      ),
    ).toBe('Anonymous Owl AB12C');
  });
});
