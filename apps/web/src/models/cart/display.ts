import type { AppTranslator } from '@/app/i18n';
import type { AnonymousAvatarKey, OrderingParticipant } from './types';

export function getAnonymousAvatarLabel(
  avatarKey: AnonymousAvatarKey,
  tDefault: AppTranslator,
): string {
  switch (avatarKey) {
    case 'bear':
      return tDefault('guest.participant.avatars.bear', 'Bear');
    case 'rainbow_cat':
      return tDefault('guest.participant.avatars.rainbow_cat', 'Rainbow Cat');
    case 'dog':
      return tDefault('guest.participant.avatars.dog', 'Dog');
    case 'eagle':
      return tDefault('guest.participant.avatars.eagle', 'Eagle');
    case 'elephant':
      return tDefault('guest.participant.avatars.elephant', 'Elephant');
    case 'flamingo':
      return tDefault('guest.participant.avatars.flamingo', 'Flamingo');
    case 'gorilla':
      return tDefault('guest.participant.avatars.gorilla', 'Gorilla');
    case 'lion':
      return tDefault('guest.participant.avatars.lion', 'Lion');
    case 'monkey':
      return tDefault('guest.participant.avatars.monkey', 'Monkey');
    case 'octopus':
      return tDefault('guest.participant.avatars.octopus', 'Octopus');
    case 'owl':
      return tDefault('guest.participant.avatars.owl', 'Owl');
    case 'ox':
      return tDefault('guest.participant.avatars.ox', 'Ox');
    case 'sheep':
      return tDefault('guest.participant.avatars.sheep', 'Sheep');
    case 'unicorn':
      return tDefault('guest.participant.avatars.unicorn', 'Unicorn');
    case 'wolf':
      return tDefault('guest.participant.avatars.wolf', 'Wolf');
    case 'zebra':
      return tDefault('guest.participant.avatars.zebra', 'Zebra');
  }
}

/**
 * Preview label shown while choosing an identity, before the backend assigns
 * the participant id. It has no discriminator suffix; the unique anonymous name
 * is finalized server-side once `participantId` exists.
 */
export function getAnonymousNamePreview(
  avatarKey: AnonymousAvatarKey,
  tDefault: AppTranslator,
): string {
  return tDefault(
    'guest.participant.anonymousNamePreview',
    'Anonymous {{animal}}',
    { animal: getAnonymousAvatarLabel(avatarKey, tDefault) },
  );
}

export function getOrderingParticipantDisplayName(
  participant: Pick<OrderingParticipant, 'avatarKey' | 'displayName' | 'id'>,
  tDefault: AppTranslator,
): string {
  const customName = participant.displayName?.trim();

  if (customName) {
    return customName;
  }

  return tDefault(
    'guest.participant.anonymousDisplayName',
    'Anonymous {{animal}} {{suffix}}',
    {
      animal: getAnonymousAvatarLabel(participant.avatarKey, tDefault),
      suffix: participant.id.slice(-5).toUpperCase(),
    },
  );
}
