import { Check } from 'lucide-react';
import { useId } from 'react';
import { useAppTranslation } from '@/app/i18n';
import {
  anonymousAvatarKeys,
  getAnonymousAvatarLabel,
  getAnonymousNamePreview,
} from '@/models/cart';
import { Field } from '@/shared/components/form/Field';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/utils/cn';
import { anonymousAvatarImages } from './avatarImages';
import type { ParticipantIdentityValues } from './participantIdentity';

type ParticipantIdentitySelectorProps = {
  className?: string;
  disabled?: boolean;
  displayNameError?: string;
  value: ParticipantIdentityValues;
  onChange: (value: ParticipantIdentityValues) => void;
};

export function ParticipantIdentitySelector({
  className,
  disabled = false,
  displayNameError,
  value,
  onChange,
}: ParticipantIdentitySelectorProps) {
  const { tDefault } = useAppTranslation();
  const avatarInputName = useId();

  return (
    <div className={cn('grid gap-6', className)}>
      <fieldset disabled={disabled}>
        <legend className="text-sm font-medium text-storefront-text">
          {tDefault('guest.participant.avatarLabel', 'Choose your avatar')}
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        </legend>

        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
          {anonymousAvatarKeys.map((avatarKey) => {
            const avatarLabel = getAnonymousAvatarLabel(avatarKey, tDefault);
            const selected = value.avatarKey === avatarKey;

            return (
              <label
                key={avatarKey}
                className={cn(
                  'relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full transition has-disabled:cursor-not-allowed has-disabled:opacity-50 has-focus-visible:outline-none has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                  selected
                    ? 'scale-110 ring-3 ring-storefront-primary ring-offset-2 ring-offset-storefront-bg'
                    : 'opacity-60 hover:opacity-100',
                )}
              >
                <input
                  checked={selected}
                  className="sr-only"
                  disabled={disabled}
                  name={avatarInputName}
                  required
                  type="radio"
                  value={avatarKey}
                  onChange={() => onChange({ ...value, avatarKey })}
                />
                <img
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                  src={anonymousAvatarImages[avatarKey]}
                />
                {selected ? (
                  <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-storefront-primary text-white ring-2 ring-storefront-bg">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : null}
                <span className="sr-only">{avatarLabel}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Field
        description={tDefault(
          'guest.participant.displayNameDescription',
          'Leave blank to use your anonymous animal name.',
        )}
        error={displayNameError}
        label={tDefault(
          'guest.participant.displayNameLabel',
          'Display name (optional)',
        )}
      >
        <Input
          disabled={disabled}
          maxLength={50}
          placeholder={getAnonymousNamePreview(value.avatarKey, tDefault)}
          value={value.displayName}
          onChange={(event) =>
            onChange({ ...value, displayName: event.target.value })
          }
        />
      </Field>
    </div>
  );
}
